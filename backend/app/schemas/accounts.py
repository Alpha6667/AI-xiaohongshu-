from pydantic import BaseModel

from app.models.enums import AccountConnectionStatus, AccountStatus, AccountSyncStatus, ReviewStatus


class AccountResponse(BaseModel):
    id: str
    name: str
    handle: str
    avatarUrl: str | None
    xhsId: str | None
    profileUrl: str | None
    status: AccountStatus
    summary: str
    lastActiveAt: str | None
    todayTaskCount: int
    waitingCount: int
    publishedCount: int
    totalEngagement: int
    bestTopic: str | None
    connectionStatus: AccountConnectionStatus
    reauthRequired: bool
    connectedAt: str | None
    lastValidatedAt: str | None
    lastUsedAt: str | None
    lastAuthError: str | None
    lastSyncAt: str | None
    lastSyncStatus: AccountSyncStatus
    lastSyncError: str | None


class WorkSyncItemResponse(BaseModel):
    postId: str
    title: str
    topic: str
    platformPostId: str | None
    platformUrl: str | None
    publishedAt: str | None
    reviewStatus: ReviewStatus
    likeCount: int
    collectCount: int
    commentCount: int
    lastSyncAt: str | None
    lastSyncStatus: AccountSyncStatus
    syncError: str | None
    updatedAt: str


class AccountWorksSyncResponse(BaseModel):
    accountId: str
    connectionStatus: AccountConnectionStatus
    reauthRequired: bool
    lastSyncAt: str | None
    lastSyncStatus: AccountSyncStatus
    lastSyncError: str | None
    works: list[WorkSyncItemResponse]
