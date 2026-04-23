from pydantic import BaseModel

from app.models.enums import AccountStatus


class AccountResponse(BaseModel):
    id: str
    name: str
    handle: str
    status: AccountStatus
    summary: str
    lastActiveAt: str | None
    todayTaskCount: int
    waitingCount: int
    publishedCount: int
    totalEngagement: int
    bestTopic: str | None
