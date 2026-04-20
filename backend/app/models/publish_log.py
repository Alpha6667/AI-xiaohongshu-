from dataclasses import dataclass

from app.models.enums import PublishStatus


@dataclass(slots=True)
class PublishLog:
    id: str
    post_id: str
    status: PublishStatus
    detail: str
    created_at: str
