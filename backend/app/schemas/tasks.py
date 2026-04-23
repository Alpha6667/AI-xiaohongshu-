from pydantic import BaseModel

from app.models.enums import MessageTaskStage


class MessageTaskResponse(BaseModel):
    id: str
    sourceMessage: str
    title: str
    topic: str
    stage: MessageTaskStage
    stageLabel: str
    nextAction: str
    postId: str | None
    accountId: str | None
    accountName: str | None
    requestedAt: str
    plannedAt: str | None
    hasCopy: bool
    hasImages: bool
    requiresHumanReview: bool
