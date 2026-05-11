from dataclasses import dataclass
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException, status

from app.models.enums import PostStatus, PublishStatus
from app.models.post import Post
from app.models.publish_log import PublishLog
from app.db.config import get_settings
from app.repositories.memory import new_id, now_iso, repository


DEFAULT_BACKEND_PUBLIC_BASE_URL = "http://127.0.0.1:8000"
OPENCLAW_METRICS_ERROR_CODES = {
    "login_required",
    "post_not_found",
    "page_structure_changed",
    "metrics_unavailable",
    "metrics_fetch_timeout",
    "metrics_fetch_execution_error",
}
OPENCLAW_METRICS_SOURCES = {"xhs_creator_center", "mock"}


@dataclass(slots=True)
class PreparedPublish:
    post: Post
    publish_log: PublishLog


class MetricsFetchError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def _normalize_metrics_error_code(code: object) -> str:
    if isinstance(code, str) and code in OPENCLAW_METRICS_ERROR_CODES:
        return code
    return "metrics_fetch_execution_error"


def _normalize_metrics_source(source: object) -> str | None:
    if source is None:
        return None
    normalized = str(source)
    if normalized in {"xhscreatorcenter", "xhscreator_center"}:
        normalized = "xhs_creator_center"
    if normalized in OPENCLAW_METRICS_SOURCES:
        return normalized
    return None


class FakePublisherAdapter:
    def _serialize_assets(self, post: Post) -> list[dict[str, str]]:
        import logging

        logger = logging.getLogger(__name__)
        assets: list[dict[str, str]] = []
        for asset_id in post.asset_ids:
            asset = repository.assets.get(asset_id)
            if asset is None:
                logger.warning("Skipping missing publish asset postId=%s assetId=%s", post.id, asset_id)
                continue
            assets.append(
                {
                    "id": asset.id,
                    "name": asset.name,
                    "url": asset.url,
                    "contentType": asset.content_type,
                }
            )
        return assets

    def _publish_webhook_url(self, configured_url: str) -> str:
        url = configured_url.rstrip("/")
        if url.endswith("/api/openclaw/publish"):
            return url
        return f"{url}/api/openclaw/publish"

    def _callback_base_url(self) -> str:
        import logging

        settings = get_settings()
        base_url = settings.backend_public_base_url.rstrip("/")
        if base_url:
            return base_url
        logging.getLogger(__name__).warning(
            "BACKEND_PUBLIC_BASE_URL is not configured, falling back to %s for OpenClaw callbacks",
            DEFAULT_BACKEND_PUBLIC_BASE_URL,
        )
        return DEFAULT_BACKEND_PUBLIC_BASE_URL

    def prepare_publish(self, post: Post, operator: str) -> PreparedPublish:
        if post.status != PostStatus.APPROVED:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only approved posts can enter publishing")

        if any(
            repository.publish_logs[log_id].status in {PublishStatus.QUEUED, PublishStatus.SUCCEEDED}
            for log_id in post.publish_log_ids
            if log_id in repository.publish_logs
        ):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Publish already queued or completed")

        created_at = now_iso()
        publish_log = PublishLog(
            id=new_id("publish"),
            post_id=post.id,
            status=PublishStatus.QUEUED,
            detail=f"Publish requested by {operator}",
            created_at=created_at,
        )
        repository.publish_logs[publish_log.id] = publish_log
        post.publish_log_ids.append(publish_log.id)
        post.status = PostStatus.PUBLISHING
        post.updated_at = created_at

        # Item 7: After entering queued state, call OpenClaw webhook
        self._notify_openclaw(publish_log, post, operator)

        return PreparedPublish(post=post, publish_log=publish_log)

    def _notify_openclaw(self, publish_log: PublishLog, post: Post, operator: str) -> None:
        """Notify OpenClaw publisher via webhook when a post enters queued state."""
        settings = get_settings()
        webhook_base = getattr(settings, "openclaw_publish_webhook_url", "")
        if not webhook_base:
            import logging
            logging.getLogger(__name__).warning(
                "OPENCLAW_PUBLISH_WEBHOOK_URL is not configured, skipping OpenClaw webhook notification"
            )
            return

        webhook_url = self._publish_webhook_url(webhook_base)
        auth_token = getattr(settings, "openclaw_publish_auth_token", "")
        callback_base_url = self._callback_base_url()

        # Build the payload matching OpenClaw's expected format
        payload = {
            "postId": post.id,
            "content": {
                "title": post.title,
                "body": post.body,
                "tags": post.tags or [],
                "assets": self._serialize_assets(post),
            },
            "account": {
                "id": getattr(post, "account_id", ""),
                "name": getattr(post, "account_name", ""),
                "handle": getattr(post, "account_handle", ""),
            },
            "callback": {
                "publishResultUrl": f"{callback_base_url}/api/posts/{post.id}/publish-result",
                "authToken": auth_token,
            },
        }

        import logging
        logger = logging.getLogger(__name__)

        try:
            data = json.dumps(payload).encode("utf-8")
            req = Request(webhook_url, data=data, method="POST")
            req.add_header("Content-Type", "application/json")
            if auth_token:
                req.add_header("Authorization", f"Bearer {auth_token}")

            with urlopen(req, timeout=10) as resp:
                response_body = resp.read().decode("utf-8")
                logger.info(f"OpenClaw webhook response ({resp.status}): {response_body[:200]}")
        except HTTPError as exc:
            logger.warning(f"OpenClaw webhook HTTP error: {exc.code} {exc.reason}")
        except URLError as exc:
            logger.warning(f"OpenClaw webhook network error: {exc.reason}")
        except Exception as exc:
            logger.warning(f"OpenClaw webhook error: {exc}")

    def submit_publish(self, prepared: PreparedPublish, operator: str) -> PreparedPublish:
        prepared.publish_log.detail = f"Submitted to OpenClaw by {operator}"
        prepared.post.updated_at = now_iso()
        return prepared

    def fetch_metrics(self, post: Post) -> dict[str, int | str | None]:
        settings = get_settings()
        metrics_url = getattr(settings, "openclaw_metrics_webhook_url", "")
        if not metrics_url:
            raise MetricsFetchError("metrics_fetch_not_configured", "OpenClaw metrics webhook URL is not configured")
        if not post.platform_post_id:
            raise MetricsFetchError("platform_post_id_missing", "Platform post id is required for metrics fetch")

        payload = json.dumps({"postId": post.id, "platformPostId": post.platform_post_id}).encode("utf-8")
        request = Request(metrics_url, data=payload, method="POST")
        request.add_header("Content-Type", "application/json")

        auth_token = getattr(settings, "openclaw_metrics_auth_token", "")
        if auth_token:
            request.add_header("Authorization", f"Bearer {auth_token}")

        timeout_seconds = max(1, int(getattr(settings, "openclaw_metrics_timeout_seconds", 10)))

        try:
            with urlopen(request, timeout=timeout_seconds) as response:
                content = response.read().decode("utf-8")
        except HTTPError as exc:
            try:
                error_payload = json.loads(exc.read().decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                error_payload = {}
            error_code = _normalize_metrics_error_code(error_payload.get("errorCode"))
            raise MetricsFetchError(error_code, str(error_payload.get("message") or f"Metrics fetch http error: {exc.code}")) from exc
        except URLError as exc:
            raise MetricsFetchError("metrics_fetch_execution_error", f"Metrics fetch network error: {exc.reason}") from exc

        try:
            raw = json.loads(content)
        except json.JSONDecodeError as exc:
            raise MetricsFetchError("metrics_fetch_invalid_response", "Metrics fetch response is not valid JSON") from exc

        error_code = raw.get("errorCode")
        if error_code is not None:
            normalized_code = _normalize_metrics_error_code(error_code)
            raise MetricsFetchError(normalized_code, str(raw.get("message") or normalized_code))

        required_keys = ("views", "likes", "favorites", "comments", "followConversions")
        missing_keys = [key for key in required_keys if key not in raw]
        if missing_keys:
            raise MetricsFetchError("metrics_fetch_invalid_payload", "Metrics response missing required fields")

        try:
            return {
                "views": int(raw["views"]),
                "likes": int(raw["likes"]),
                "favorites": int(raw["favorites"]),
                "comments": int(raw["comments"]),
                "followConversions": int(raw["followConversions"]),
                "source": _normalize_metrics_source(raw.get("source")),
                "capturedAt": raw.get("capturedAt"),
            }
        except (TypeError, ValueError) as exc:
            raise MetricsFetchError("metrics_fetch_invalid_payload", "Metrics response contains invalid numeric fields") from exc


publisher_adapter = FakePublisherAdapter()
