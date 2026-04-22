from dataclasses import dataclass

from app.models.enums import PublishFailureType, PublishStatus


@dataclass(slots=True)
class PublishLog:
    id: str
    post_id: str
    status: PublishStatus
    detail: str
    created_at: str
    platform_post_id: str | None = None
    error_message: str | None = None
    failure_type: PublishFailureType | None = None
