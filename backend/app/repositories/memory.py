from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from dataclasses import asdict

from app.models.asset import Asset
from app.models.enums import GenerationTaskType, PostStatus, PublishStatus, ReviewAction, TaskStatus
from app.models.generation_task import GenerationTask
from app.models.metrics_snapshot import MetricsSnapshot
from app.models.post import Post
from app.models.publish_log import PublishLog
from app.models.review_record import ReviewRecord


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:10]}"


class InMemoryRepository:
    def __init__(self, storage_path: Path | None = None) -> None:
        self.posts: dict[str, Post] = {}
        self.assets: dict[str, Asset] = {}
        self.review_records: dict[str, ReviewRecord] = {}
        self.generation_tasks: dict[str, GenerationTask] = {}
        self.publish_logs: dict[str, PublishLog] = {}
        self.metrics_snapshots: dict[str, list[MetricsSnapshot]] = {}
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
                asset_ids=list(value.get("asset_ids", [])),
                platform_post_id=value.get("platform_post_id"),
                created_at=value.get("created_at", ""),
                updated_at=value.get("updated_at", ""),
                published_at=value.get("published_at"),
                review_record_ids=list(value.get("review_record_ids", [])),
                generation_task_ids=list(value.get("generation_task_ids", [])),
                publish_log_ids=list(value.get("publish_log_ids", [])),
            )
            for key, value in (payload.get("posts", {}) or {}).items()
        }

        self.assets = {
            key: Asset(
                id=value["id"],
                name=value["name"],
                file_name=value["file_name"],
                content_type=value["content_type"],
                url=value["url"],
                created_at=value["created_at"],
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
                post_id=value["post_id"],
                status=PublishStatus(value["status"]),
                detail=value["detail"],
                created_at=value["created_at"],
                platform_post_id=value.get("platform_post_id"),
                error_message=value.get("error_message"),
            )
            for key, value in (payload.get("publish_logs", {}) or {}).items()
        }

        self.metrics_snapshots = {
            post_id: [
                MetricsSnapshot(
                    id=item["id"],
                    post_id=item["post_id"],
                    views=item["views"],
                    likes=item["likes"],
                    favorites=item["favorites"],
                    comments=item["comments"],
                    follow_conversions=item["follow_conversions"],
                    snapshot_at=item["snapshot_at"],
                )
                for item in snapshots
            ]
            for post_id, snapshots in (payload.get("metrics_snapshots", {}) or {}).items()
        }

    def save(self) -> None:
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "posts": {key: asdict(value) for key, value in self.posts.items()},
            "assets": {key: asdict(value) for key, value in self.assets.items()},
            "review_records": {key: asdict(value) for key, value in self.review_records.items()},
            "generation_tasks": {key: asdict(value) for key, value in self.generation_tasks.items()},
            "publish_logs": {key: asdict(value) for key, value in self.publish_logs.items()},
            "metrics_snapshots": {
                key: [asdict(snapshot) for snapshot in snapshots]
                for key, snapshots in self.metrics_snapshots.items()
            },
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
        self._seed()
        self.save()

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


repository = InMemoryRepository()
