from pydantic import BaseModel, Field

from app.models.enums import AccountSyncStatus, PostStatus, ReviewAction, ReviewStatus


class ConfirmationUpdateRequest(BaseModel):
    title: str | None = None
    body: str | None = None
    tags: list[str] | None = None
    assetIds: list[str] | None = None
    accountId: str | None = None


class ConfirmationAssetResponse(BaseModel):
    id: str
    name: str
    fileName: str
    contentType: str
    url: str
    createdAt: str


class ConfirmationReviewRecordResponse(BaseModel):
    id: str
    action: ReviewAction
    comment: str
    operator: str
    createdAt: str


class ConfirmationPublishRecordResponse(BaseModel):
    id: str
    status: str
    detail: str
    createdAt: str
    executionId: str | None = None
    platformPostId: str | None = None
    errorMessage: str | None = None
    failureType: str | None = None
    executionLogs: list[str] = Field(default_factory=list)


class ConfirmationSummaryResponse(BaseModel):
    id: str
    postId: str
    topic: str
    title: str
    body: str
    tags: list[str]
    status: PostStatus
    reviewStatus: ReviewStatus
    assetIds: list[str]
    accountId: str | None
    accountName: str | None = None
    platformPostId: str | None
    platformUrl: str | None
    likeCount: int | None = None
    collectCount: int | None = None
    commentCount: int | None = None
    lastSyncAt: str | None = None
    lastSyncStatus: AccountSyncStatus = AccountSyncStatus.UNKNOWN
    syncError: str | None = None
    messageTaskId: str | None
    sourceMessage: str | None = None
    confirmationSource: str | None = None
    confirmationSourceLabel: str | None = None
    updatedAt: str
    createdAt: str
    publishedAt: str | None


class ConfirmationDetailResponse(ConfirmationSummaryResponse):
    assets: list[ConfirmationAssetResponse]
    reviewRecords: list[ConfirmationReviewRecordResponse]
    publishRecords: list[ConfirmationPublishRecordResponse]
