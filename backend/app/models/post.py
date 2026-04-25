from dataclasses import dataclass, field

from app.models.enums import AccountSyncStatus, PostStatus, ReviewStatus


@dataclass(slots=True)
class Post:
    id: str
    topic: str
    title: str
    body: str
    tags: list[str]
    status: PostStatus
    asset_ids: list[str] = field(default_factory=list)
    platform_post_id: str | None = None
    platform_url: str | None = None
    account_id: str | None = None
    message_task_id: str | None = None
    review_status: ReviewStatus = ReviewStatus.UNKNOWN
    like_count: int | None = None
    collect_count: int | None = None
    comment_count: int | None = None
    last_sync_at: str | None = None
    last_sync_status: AccountSyncStatus = AccountSyncStatus.UNKNOWN
    sync_error: str | None = None
    created_at: str = ""
    updated_at: str = ""
    published_at: str | None = None
    review_record_ids: list[str] = field(default_factory=list)
    generation_task_ids: list[str] = field(default_factory=list)
    publish_log_ids: list[str] = field(default_factory=list)
