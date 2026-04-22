from pydantic import BaseModel

from app.models.enums import MessageTaskStage


class MessageTaskResponse(BaseModel):
    id: str
    sourceMessage: str
    topic: str
    stage: MessageTaskStage
    postId: str | None
    accountId: str | None
    requestedAt: str
    scheduledAt: str | None
    hasCopy: bool
    hasImages: bool
    requiresHumanReview: bool
