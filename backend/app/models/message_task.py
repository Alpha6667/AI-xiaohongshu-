from dataclasses import dataclass

from app.models.enums import MessageTaskStage


@dataclass(slots=True)
class MessageTask:
    id: str
    source_message: str
    topic: str
    stage: MessageTaskStage
    post_id: str | None
    account_id: str | None
    requested_at: str
    scheduled_at: str | None
    has_copy: bool
    has_images: bool
    requires_human_review: bool
    created_at: str
    updated_at: str
