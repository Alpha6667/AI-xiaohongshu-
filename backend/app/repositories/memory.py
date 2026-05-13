from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from dataclasses import asdict

from app.models.account import Account
from app.models.asset import Asset
from app.models.enums import (
    AccountConnectionStatus,
    AccountStatus,
    AccountSyncStatus,
    GenerationTaskType,
    MessageTaskStage,
    PostStatus,
    PublishFailureType,
    PublishStatus,
    ReviewAction,
    ReviewStatus,
    TaskStatus,
)
from app.models.generation_task import GenerationTask
from app.models.image_provider import ImageProviderConfig
from app.models.inbound_message import InboundMessage
from app.models.message_task import MessageTask
from app.models.metrics_snapshot import MetricsSnapshot
from app.models.post import Post
from app.models.publish_log import PublishLog
from app.models.review_record import ReviewRecord


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:10]}"


def read_field(payload: dict[str, object], snake_name: str, camel_name: str | None = None, default: object = None) -> object:
    if snake_name in payload:
        return payload[snake_name]
    if camel_name is not None and camel_name in payload:
        return payload[camel_name]
    return default


def list_field(payload: dict[str, object], snake_name: str, camel_name: str | None = None) -> list[object]:
    value = read_field(payload, snake_name, camel_name, [])
    return list(value or [])


def enum_field(enum_type, payload: dict[str, object], snake_name: str, camel_name: str | None = None, default=None):
    value = read_field(payload, snake_name, camel_name)
    if value is None:
        return default
    return enum_type(value)


def normalize_metrics_source(source: object) -> str | None:
    if source is None:
        return None
    normalized = str(source)
    if normalized in {"xhscreatorcenter", "xhscreator_center"}:
        normalized = "xhs_creator_center"
    if normalized in {"xhs_creator_center", "mock"}:
        return normalized
    return None


def post_to_payload(post: Post) -> dict[str, object]:
    payload = asdict(post)
    payload.update(
        {
            "assetIds": list(post.asset_ids),
            "platformPostId": post.platform_post_id,
            "platformUrl": post.platform_url,
            "accountId": post.account_id,
            "messageTaskId": post.message_task_id,
            "reviewStatus": post.review_status,
            "likeCount": post.like_count,
            "collectCount": post.collect_count,
            "commentCount": post.comment_count,
            "lastSyncAt": post.last_sync_at,
            "lastSyncStatus": post.last_sync_status,
            "syncError": post.sync_error,
            "createdAt": post.created_at,
            "updatedAt": post.updated_at,
            "publishedAt": post.published_at,
            "reviewRecordIds": list(post.review_record_ids),
            "generationTaskIds": list(post.generation_task_ids),
            "publishLogIds": list(post.publish_log_ids),
        }
    )
    return payload


def publish_log_to_payload(log: PublishLog) -> dict[str, object]:
    payload = asdict(log)
    payload.update(
        {
            "postId": log.post_id,
            "createdAt": log.created_at,
            "platformPostId": log.platform_post_id,
            "errorMessage": log.error_message,
            "failureType": log.failure_type,
        }
    )
    return payload


def metrics_snapshot_to_payload(snapshot: MetricsSnapshot) -> dict[str, object]:
    payload = asdict(snapshot)
    payload.update(
        {
            "postId": snapshot.post_id,
            "followConversions": snapshot.follow_conversions,
            "snapshotAt": snapshot.snapshot_at,
            "capturedAt": snapshot.captured_at,
        }
    )
    return payload


def asset_to_payload(asset: Asset) -> dict[str, object]:
    payload = asdict(asset)
    payload.update(
        {
            "fileName": asset.file_name,
            "contentType": asset.content_type,
            "mimeType": asset.content_type,
            "thumbnailUrl": asset.thumbnail_url,
            "createdAt": asset.created_at,
            "durationSeconds": asset.duration_seconds,
        }
    )
    return payload


class InMemoryRepository:
    def __init__(self, storage_path: Path | None = None) -> None:
        self.posts: dict[str, Post] = {}
        self.assets: dict[str, Asset] = {}
        self.review_records: dict[str, ReviewRecord] = {}
        self.generation_tasks: dict[str, GenerationTask] = {}
        self.publish_logs: dict[str, PublishLog] = {}
        self.metrics_snapshots: dict[str, list[MetricsSnapshot]] = {}
        self.accounts: dict[str, Account] = {}
        self.message_tasks: dict[str, MessageTask] = {}
        self.inbound_messages: dict[str, InboundMessage] = {}
        self.image_provider_config: ImageProviderConfig | None = None
        self.storage_path = storage_path or (Path(__file__).resolve().parents[2] / "data" / "repository.json")
        self._load_or_seed()

    def _load_or_seed(self) -> None:
        if not self.storage_path.exists():
            self._seed()
            self.save()
            return

        payload = json.loads(self.storage_path.read_text(encoding="utf-8"))
        self._load_from_payload(payload)

    def _load_from_payload(self, payload: dict[str, object]) -> None:
        self.posts = {
            key: Post(
                id=value["id"],
                topic=value["topic"],
                title=value["title"],
                body=value["body"],
                tags=list(value.get("tags", [])),
                status=PostStatus(value["status"]),
                asset_ids=list_field(value, "asset_ids", "assetIds"),
                platform_post_id=read_field(value, "platform_post_id", "platformPostId"),
                platform_url=read_field(value, "platform_url", "platformUrl"),
                account_id=read_field(value, "account_id", "accountId"),
                message_task_id=read_field(value, "message_task_id", "messageTaskId"),
                review_status=enum_field(ReviewStatus, value, "review_status", "reviewStatus", ReviewStatus.UNKNOWN),
                like_count=read_field(value, "like_count", "likeCount"),
                collect_count=read_field(value, "collect_count", "collectCount"),
                comment_count=read_field(value, "comment_count", "commentCount"),
                last_sync_at=read_field(value, "last_sync_at", "lastSyncAt"),
                last_sync_status=enum_field(AccountSyncStatus, value, "last_sync_status", "lastSyncStatus", AccountSyncStatus.UNKNOWN),
                sync_error=read_field(value, "sync_error", "syncError"),
                created_at=read_field(value, "created_at", "createdAt", ""),
                updated_at=read_field(value, "updated_at", "updatedAt", ""),
                published_at=read_field(value, "published_at", "publishedAt"),
                review_record_ids=list_field(value, "review_record_ids", "reviewRecordIds"),
                generation_task_ids=list_field(value, "generation_task_ids", "generationTaskIds"),
                publish_log_ids=list_field(value, "publish_log_ids", "publishLogIds"),
            )
            for key, value in (payload.get("posts", {}) or {}).items()
        }

        self.assets = {
            key: Asset(
                id=value["id"],
                name=value["name"],
                file_name=read_field(value, "file_name", "fileName", ""),
                content_type=read_field(value, "content_type", "contentType", read_field(value, "mime_type", "mimeType", "application/octet-stream")),
                url=value["url"],
                created_at=read_field(value, "created_at", "createdAt", ""),
                type=read_field(value, "type"),
                thumbnail_url=read_field(value, "thumbnail_url", "thumbnailUrl"),
                width=read_field(value, "width"),
                height=read_field(value, "height"),
                duration_seconds=read_field(value, "duration_seconds", "durationSeconds"),
            )
            for key, value in (payload.get("assets", {}) or {}).items()
        }

        self.review_records = {
            key: ReviewRecord(
                id=value["id"],
                post_id=value["post_id"],
                action=ReviewAction(value["action"]),
                comment=value["comment"],
                operator=value["operator"],
                created_at=value["created_at"],
            )
            for key, value in (payload.get("review_records", {}) or {}).items()
        }

        self.generation_tasks = {
            key: GenerationTask(
                id=value["id"],
                post_id=value["post_id"],
                task_type=GenerationTaskType(value["task_type"]),
                status=TaskStatus(value["status"]),
                payload=dict(value.get("payload", {})),
                created_at=value["created_at"],
            )
            for key, value in (payload.get("generation_tasks", {}) or {}).items()
        }

        self.publish_logs = {
            key: PublishLog(
                id=value["id"],
                post_id=read_field(value, "post_id", "postId"),
                status=PublishStatus(value["status"]),
                detail=value["detail"],
                created_at=read_field(value, "created_at", "createdAt", ""),
                platform_post_id=read_field(value, "platform_post_id", "platformPostId"),
                error_message=read_field(value, "error_message", "errorMessage"),
                failure_type=(
                    PublishFailureType(read_field(value, "failure_type", "failureType"))
                    if read_field(value, "failure_type", "failureType") is not None
                    else None
                ),
            )
            for key, value in (payload.get("publish_logs", {}) or {}).items()
        }

        self.metrics_snapshots = {
            post_id: [
                MetricsSnapshot(
                    id=item["id"],
                    post_id=read_field(item, "post_id", "postId"),
                    views=item["views"],
                    likes=item["likes"],
                    favorites=item["favorites"],
                    comments=item["comments"],
                    follow_conversions=read_field(item, "follow_conversions", "followConversions"),
                    snapshot_at=read_field(item, "snapshot_at", "snapshotAt", ""),
                    source=normalize_metrics_source(item.get("source")),
                    captured_at=read_field(item, "captured_at", "capturedAt"),
                )
                for item in snapshots
            ]
            for post_id, snapshots in (payload.get("metrics_snapshots", {}) or {}).items()
        }

        self.accounts = {
            key: Account(
                id=value["id"],
                name=value["name"],
                handle=value["handle"],
                status=AccountStatus(value["status"]),
                summary=value["summary"],
                last_active_at=value.get("last_active_at"),
                created_at=value["created_at"],
                updated_at=value["updated_at"],
                connection_status=(
                    AccountConnectionStatus(value["connection_status"])
                    if value.get("connection_status") is not None
                    else AccountConnectionStatus.UNKNOWN
                ),
                reauth_required=value.get("reauth_required", False),
                connected_at=value.get("connected_at"),
                last_validated_at=value.get("last_validated_at"),
                last_used_at=value.get("last_used_at"),
                last_auth_error=value.get("last_auth_error"),
                last_sync_at=value.get("last_sync_at"),
                last_sync_status=(
                    AccountSyncStatus(value["last_sync_status"])
                    if value.get("last_sync_status") is not None
                    else AccountSyncStatus.UNKNOWN
                ),
                last_sync_error=value.get("last_sync_error"),
            )
            for key, value in (payload.get("accounts", {}) or {}).items()
        }

        self.message_tasks = {
            key: MessageTask(
                id=value["id"],
                source_message=value["source_message"],
                topic=value["topic"],
                stage=MessageTaskStage(value["stage"]),
                post_id=value.get("post_id"),
                account_id=value.get("account_id"),
                requested_at=value["requested_at"],
                scheduled_at=value.get("scheduled_at"),
                has_copy=value["has_copy"],
                has_images=value["has_images"],
                requires_human_review=value["requires_human_review"],
                created_at=value["created_at"],
                updated_at=value["updated_at"],
            )
            for key, value in (payload.get("message_tasks", {}) or {}).items()
        }
        self.inbound_messages = {
            key: InboundMessage(
                id=value["id"],
                event_id=value["event_id"],
                source=value["source"],
                sender_id=value["sender_id"],
                sender_name=value["sender_name"],
                conversation_id=value["conversation_id"],
                content=value["content"],
                sent_at=value["sent_at"],
                signature=value["signature"],
                received_at=value["received_at"],
                message_task_id=value["message_task_id"],
            )
            for key, value in (payload.get("inbound_messages", {}) or {}).items()
        }
        image_provider_payload = payload.get("image_provider_config")
        if image_provider_payload is None:
            self.image_provider_config = None
        else:
            self.image_provider_config = ImageProviderConfig(
                provider=image_provider_payload["provider"],
                api_key=image_provider_payload.get("api_key", ""),
                image_model=image_provider_payload.get("image_model", ""),
                base_url=image_provider_payload.get("base_url"),
                updated_at=image_provider_payload.get("updated_at", ""),
            )
        self._ensure_minimum_support_data()

    def save(self) -> None:
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "posts": {key: post_to_payload(value) for key, value in self.posts.items()},
            "assets": {key: asset_to_payload(value) for key, value in self.assets.items()},
            "review_records": {key: asdict(value) for key, value in self.review_records.items()},
            "generation_tasks": {key: asdict(value) for key, value in self.generation_tasks.items()},
            "publish_logs": {key: publish_log_to_payload(value) for key, value in self.publish_logs.items()},
            "metrics_snapshots": {
                key: [metrics_snapshot_to_payload(snapshot) for snapshot in snapshots]
                for key, snapshots in self.metrics_snapshots.items()
            },
            "accounts": {key: asdict(value) for key, value in self.accounts.items()},
            "message_tasks": {key: asdict(value) for key, value in self.message_tasks.items()},
            "inbound_messages": {key: asdict(value) for key, value in self.inbound_messages.items()},
            "image_provider_config": asdict(self.image_provider_config) if self.image_provider_config is not None else None,
        }
        self.storage_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8",
        )

    def reset_to_seed(self) -> None:
        self.posts.clear()
        self.assets.clear()
        self.review_records.clear()
        self.generation_tasks.clear()
        self.publish_logs.clear()
        self.metrics_snapshots.clear()
        self.accounts.clear()
        self.message_tasks.clear()
        self.inbound_messages.clear()
        self.image_provider_config = None
        self._seed()
        self.save()

    def _ensure_minimum_support_data(self) -> None:
        if not self.accounts:
            created_at = now_iso()
            self.accounts["account_seed_brand"] = Account(
                id="account_seed_brand",
                name="主品牌号",
                handle="@brand_main",
                status=AccountStatus.ONLINE,
                summary="主营内容与品牌日常发布",
                last_active_at=created_at,
                created_at=created_at,
                updated_at=created_at,
                connection_status=AccountConnectionStatus.CONNECTED,
                connected_at=created_at,
                last_validated_at=created_at,
                last_sync_at=created_at,
                last_sync_status=AccountSyncStatus.SUCCEEDED,
            )
            self.accounts["account_seed_store"] = Account(
                id="account_seed_store",
                name="门店号",
                handle="@brand_store",
                status=AccountStatus.ONLINE,
                summary="门店活动与到店转化内容",
                last_active_at=created_at,
                created_at=created_at,
                updated_at=created_at,
                connection_status=AccountConnectionStatus.CONNECTED,
                connected_at=created_at,
                last_validated_at=created_at,
                last_sync_at=created_at,
                last_sync_status=AccountSyncStatus.SUCCEEDED,
            )

        seed_store = self.accounts.get("account_seed_store")
        if (
            seed_store is not None
            and seed_store.connection_status == AccountConnectionStatus.VALIDATING
            and not seed_store.reauth_required
            and seed_store.last_auth_error is None
        ):
            seed_store.status = AccountStatus.ONLINE
            seed_store.connection_status = AccountConnectionStatus.CONNECTED
            seed_store.last_sync_status = AccountSyncStatus.SUCCEEDED
            seed_store.last_sync_error = None

        default_account_id = next(iter(self.accounts.keys())) if self.accounts else None
        if default_account_id is not None:
            for post in self.posts.values():
                if post.account_id is None:
                    post.account_id = default_account_id

        if self.message_tasks:
            return

        for post in self.posts.values():
            stage = {
                PostStatus.DRAFT: MessageTaskStage.PENDING_GENERATION,
                PostStatus.IN_REVIEW: MessageTaskStage.WAITING_REVIEW,
                PostStatus.APPROVED: MessageTaskStage.WAITING_PUBLISH,
                PostStatus.PUBLISHING: MessageTaskStage.PUBLISHING,
                PostStatus.UNDER_REVIEW: MessageTaskStage.PUBLISHING,
                PostStatus.PUBLISHED: MessageTaskStage.PUBLISHED,
                PostStatus.REJECTED: MessageTaskStage.FAILED,
                PostStatus.PUBLISH_FAILED: MessageTaskStage.FAILED,
            }[post.status]

            task_id = f"taskmsg_{post.id}"
            message_task = MessageTask(
                id=task_id,
                source_message=f"请把这个主题整理成小红书帖子：{post.topic}",
                topic=post.topic,
                stage=stage,
                post_id=post.id,
                account_id=post.account_id,
                requested_at=post.created_at or now_iso(),
                scheduled_at=None,
                has_copy=bool(post.body.strip()),
                has_images=bool(post.asset_ids),
                requires_human_review=stage in {MessageTaskStage.WAITING_REVIEW, MessageTaskStage.WAITING_PUBLISH},
                created_at=post.created_at or now_iso(),
                updated_at=post.updated_at or now_iso(),
            )
            self.message_tasks[task_id] = message_task
            post.message_task_id = task_id

    def _seed(self) -> None:
        created_at = now_iso()

        asset = Asset(
            id="asset_seed_cover",
            name="品牌空间封面",
            file_name="brand-space-cover.jpg",
            content_type="image/jpeg",
            url="https://example.com/assets/brand-space-cover.jpg",
            created_at=created_at,
        )
        self.assets[asset.id] = asset

        draft_post = Post(
            id="post_seed_draft",
            topic="春季护肤内容排期",
            title="换季敏感肌，先把护肤节奏慢下来",
            body="围绕低刺激、真实体验和收藏价值组织正文结构。",
            tags=["敏感肌", "春季护肤", "内容策划"],
            status=PostStatus.DRAFT,
            asset_ids=[asset.id],
            review_status=ReviewStatus.PENDING,
            last_sync_status=AccountSyncStatus.IDLE,
            account_id="account_seed_brand",
            created_at=created_at,
            updated_at=created_at,
        )
        review_post = Post(
            id="post_seed_review",
            topic="桌搭内容策划",
            title="让办公区更像灵感区，而不是任务堆积区",
            body="从灯光、收纳和桌面秩序切入，强调轻改造。",
            tags=["桌搭", "办公区", "氛围感"],
            status=PostStatus.IN_REVIEW,
            review_status=ReviewStatus.PENDING,
            last_sync_status=AccountSyncStatus.IDLE,
            account_id="account_seed_store",
            created_at=created_at,
            updated_at=created_at,
        )
        published_post = Post(
            id="post_seed_published",
            topic="品牌空间拍摄记录",
            title="一个让人愿意停留的品牌空间，细节都在光线里",
            body="以编辑手记方式写空间、材质和动线。",
            tags=["品牌空间", "门店拍摄", "内容策划"],
            status=PostStatus.PUBLISHED,
            asset_ids=[asset.id],
            platform_post_id="xh_123456",
            platform_url="https://www.xiaohongshu.com/explore/xh_123456",
            account_id="account_seed_brand",
            review_status=ReviewStatus.APPROVED,
            like_count=1260,
            collect_count=842,
            comment_count=115,
            last_sync_at=created_at,
            last_sync_status=AccountSyncStatus.SUCCEEDED,
            created_at=created_at,
            updated_at=created_at,
            published_at=created_at,
        )

        self.posts[draft_post.id] = draft_post
        self.posts[review_post.id] = review_post
        self.posts[published_post.id] = published_post

        submit_record = ReviewRecord(
            id="review_seed_submit",
            post_id=review_post.id,
            action=ReviewAction.SUBMIT,
            comment="请确认标题语气是否自然。",
            operator="Nora",
            created_at=created_at,
        )
        approve_record = ReviewRecord(
            id="review_seed_approve",
            post_id=published_post.id,
            action=ReviewAction.APPROVE,
            comment="通过，保留品牌叙述节奏。",
            operator="Mika",
            created_at=created_at,
        )
        self.review_records[submit_record.id] = submit_record
        self.review_records[approve_record.id] = approve_record
        review_post.review_record_ids.append(submit_record.id)
        published_post.review_record_ids.append(approve_record.id)

        publish_log = PublishLog(
            id="publish_seed_success",
            post_id=published_post.id,
            status=PublishStatus.SUCCEEDED,
            detail="已完成发布占位并回写 platform_post_id。",
            created_at=created_at,
        )
        self.publish_logs[publish_log.id] = publish_log
        published_post.publish_log_ids.append(publish_log.id)

        snapshot = MetricsSnapshot(
            id="metric_seed_1",
            post_id=published_post.id,
            views=18234,
            likes=1260,
            favorites=842,
            comments=115,
            follow_conversions=93,
            snapshot_at=created_at,
            source="mock",
            captured_at=created_at,
        )
        self.metrics_snapshots[published_post.id] = [snapshot]

        copy_task = GenerationTask(
            id="task_seed_copy",
            post_id=draft_post.id,
            task_type=GenerationTaskType.COPY,
            status=TaskStatus.PENDING,
            payload={"topic": draft_post.topic},
            created_at=created_at,
        )
        self.generation_tasks[copy_task.id] = copy_task
        draft_post.generation_task_ids.append(copy_task.id)
        self._ensure_minimum_support_data()


repository = InMemoryRepository()
