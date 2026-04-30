from typing import Literal

from pydantic import BaseModel, Field

from app.models.enums import AccountSyncStatus, GenerationTaskType, PostStatus, PublishFailureType, PublishStatus, ReviewAction, ReviewStatus, TaskStatus


class PostCreateRequest(BaseModel):
    topic: str
    title: str
    body: str
    tags: list[str] = Field(default_factory=list)
    assetIds: list[str] = Field(default_factory=list)
    accountId: str | None = None


class PostUpdateRequest(BaseModel):
    topic: str | None = None
    title: str | None = None
    body: str | None = None
    tags: list[str] | None = None
    assetIds: list[str] | None = None
    accountId: str | None = None


class ReviewRequest(BaseModel):
    comment: str = ""
    operator: str = "system"


class GenerateTaskRequest(BaseModel):
    operator: str = "system"
    payload: dict[str, object] = Field(default_factory=dict)


class TaskRecordResponse(BaseModel):
    taskId: str
    postId: str
    status: TaskStatus
    taskType: GenerationTaskType
    createdAt: str
    message: str


class PublishResponse(BaseModel):
    publishLogId: str
    postId: str
    status: PostStatus
    publishStatus: PublishStatus
    detail: str
    createdAt: str
    message: str
    executionId: str | None = None
    platformPostId: str | None = None
    publishedAt: str | None = None
    errorMessage: str | None = None
    failureType: PublishFailureType | None = None
    executionLogs: list[str] = Field(default_factory=list)


class PublishResultWritebackRequest(BaseModel):
    publishStatus: PublishStatus
    operator: str = "worker"
    detail: str = ""
    platformPostId: str | None = None
    errorMessage: str | None = None
    failureType: PublishFailureType | None = None


class OpenClawPublishExecuteRequest(BaseModel):
    operator: str = "openclaw"
    simulateResult: Literal["none", "succeeded", "failed"] = "none"
    detail: str = ""
    platformPostId: str | None = None
    errorMessage: str | None = None
    failureType: PublishFailureType | None = None


class MetricsSnapshotAppendRequest(BaseModel):
    views: int
    likes: int
    favorites: int
    comments: int
    followConversions: int
    snapshotAt: str | None = None


class AssetSummaryResponse(BaseModel):
    id: str
    name: str
    fileName: str
    contentType: str
    url: str
    createdAt: str


class PostMetricsResponse(BaseModel):
    views: int
    likes: int
    favorites: int
    comments: int
    followConversions: int


class ReviewRecordResponse(BaseModel):
    id: str
    action: ReviewAction
    comment: str
    operator: str
    createdAt: str


class PublishLogResponse(BaseModel):
    id: str
    status: PublishStatus
    detail: str
    createdAt: str
    executionId: str | None = None
    platformPostId: str | None = None
    errorMessage: str | None = None
    failureType: PublishFailureType | None = None
    executionLogs: list[str] = Field(default_factory=list)


class MetricsSnapshotResponse(BaseModel):
    id: str
    snapshotAt: str
    views: int
    likes: int
    favorites: int
    comments: int
    followConversions: int


class PostSummaryResponse(BaseModel):
    id: str
    topic: str
    title: str
    body: str
    tags: list[str]
    status: PostStatus
    assetIds: list[str]
    latestTaskIds: list[str]
    latestMetrics: PostMetricsResponse
    platformPostId: str | None
    platformUrl: str | None
    accountId: str | None
    accountName: str | None = None
    messageTaskId: str | None
    reviewStatus: ReviewStatus = ReviewStatus.UNKNOWN
    likeCount: int | None = None
    collectCount: int | None = None
    commentCount: int | None = None
    lastSyncAt: str | None = None
    lastSyncStatus: AccountSyncStatus = AccountSyncStatus.UNKNOWN
    syncError: str | None = None
    sourceMessage: str | None = None
    confirmationSource: str | None = None
    confirmationSourceLabel: str | None = None
    createdAt: str
    updatedAt: str
    publishedAt: str | None


class PostDetailResponse(PostSummaryResponse):
    assets: list[AssetSummaryResponse]
    reviewRecords: list[ReviewRecordResponse]
    publishRecords: list[PublishLogResponse]
    metricsHistory: list[MetricsSnapshotResponse]
