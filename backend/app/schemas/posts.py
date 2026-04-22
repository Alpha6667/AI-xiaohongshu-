from pydantic import BaseModel, Field

from app.models.enums import GenerationTaskType, PostStatus, PublishFailureType, PublishStatus, ReviewAction, TaskStatus


class PostCreateRequest(BaseModel):
    topic: str
    title: str
    body: str
    tags: list[str] = Field(default_factory=list)
    assetIds: list[str] = Field(default_factory=list)


class PostUpdateRequest(BaseModel):
    topic: str | None = None
    title: str | None = None
    body: str | None = None
    tags: list[str] | None = None
    assetIds: list[str] | None = None


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
    platformPostId: str | None = None
    errorMessage: str | None = None
    failureType: PublishFailureType | None = None


class PublishResultWritebackRequest(BaseModel):
    publishStatus: PublishStatus
    operator: str = "worker"
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
    platformPostId: str | None = None
    errorMessage: str | None = None
    failureType: PublishFailureType | None = None


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
    createdAt: str
    updatedAt: str
    publishedAt: str | None


class PostDetailResponse(PostSummaryResponse):
    assets: list[AssetSummaryResponse]
    reviewRecords: list[ReviewRecordResponse]
    publishRecords: list[PublishLogResponse]
    metricsHistory: list[MetricsSnapshotResponse]
