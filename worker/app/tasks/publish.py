from typing import Callable

from app.tasks.status import TASK_STATUS
from app.tasks.backend_client import post_backend


def _build_publish_writeback_payload(payload: dict[str, object]) -> dict[str, object]:
    result_type = str(payload.get("resultType", "success"))

    if result_type == "retryable_failure":
        return {
            "publishStatus": "failed",
            "operator": str(payload.get("operator", "worker")),
            "detail": str(payload.get("detail", "Publish failed: retryable")),
            "errorMessage": str(payload.get("errorMessage", "Temporary upstream failure")),
            "failureType": "retryable",
        }
    if result_type == "rate_limited":
        return {
            "publishStatus": "failed",
            "operator": str(payload.get("operator", "worker")),
            "detail": str(payload.get("detail", "Publish failed: rate limited")),
            "errorMessage": str(payload.get("errorMessage", "Platform rate limited")),
            "failureType": "rate_limited",
        }
    if result_type == "non_retryable_failure":
        return {
            "publishStatus": "failed",
            "operator": str(payload.get("operator", "worker")),
            "detail": str(payload.get("detail", "Publish failed: non-retryable")),
            "errorMessage": str(payload.get("errorMessage", "Content rejected by platform")),
            "failureType": "non_retryable",
        }
    return {
        "publishStatus": "succeeded",
        "operator": str(payload.get("operator", "worker")),
        "detail": str(payload.get("detail", "Publish succeeded")),
        "platformPostId": str(payload.get("platformPostId", "xh_mock_auto")),
    }


def run_publish_task(
    task_id: str,
    payload: dict[str, object],
    backend_post: Callable[[str, dict[str, object]], dict[str, object]] | None = None,
) -> dict[str, object]:
    post_fn = backend_post or post_backend
    post_id = str(payload.get("postId", "")).strip()
    if not post_id:
        raise ValueError("publish task payload requires postId")

    writeback_payload = _build_publish_writeback_payload(payload)
    writeback_response = post_fn(f"/api/posts/{post_id}/publish-result", writeback_payload)

    return {
        "taskId": task_id,
        "taskType": "publish",
        "status": TASK_STATUS["SUCCEEDED"],
        "payload": payload,
        "message": "Publish task completed and writeback triggered",
        "writeback": writeback_response,
    }
