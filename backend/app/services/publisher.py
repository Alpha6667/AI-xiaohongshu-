from dataclasses import dataclass

from fastapi import HTTPException, status

from app.models.enums import PostStatus, PublishStatus
from app.models.post import Post
from app.models.publish_log import PublishLog
from app.repositories.memory import new_id, now_iso, repository


@dataclass(slots=True)
class PreparedPublish:
    post: Post
    publish_log: PublishLog


class FakePublisherAdapter:
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
        return PreparedPublish(post=post, publish_log=publish_log)

    def submit_publish(self, prepared: PreparedPublish, operator: str) -> PreparedPublish:
        prepared.publish_log.detail = f"Submitted to OpenClaw by {operator}"
        prepared.post.updated_at = now_iso()
        return prepared

    def fetch_metrics(self, post: Post) -> dict[str, int]:
        snapshots = repository.metrics_snapshots.get(post.id, [])
        if not snapshots:
            return {"views": 0, "likes": 0, "favorites": 0, "comments": 0, "followConversions": 0}
        latest = snapshots[-1]
        return {
            "views": latest.views,
            "likes": latest.likes,
            "favorites": latest.favorites,
            "comments": latest.comments,
            "followConversions": latest.follow_conversions,
        }


publisher_adapter = FakePublisherAdapter()
