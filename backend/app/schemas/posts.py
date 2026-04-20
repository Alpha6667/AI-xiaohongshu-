from pydantic import BaseModel, Field

from app.models.enums import PostStatus, ReviewAction, TaskStatus


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
    taskType: str
    createdAt: str


class PublishResponse(BaseModel):
    publishLogId: str
    postId: str
    status: PostStatus
    detail: str
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
    status: str
    detail: str
    createdAt: str


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
    reviewRecords: list[ReviewRecordResponse]
    publishRecords: list[PublishLogResponse]
    metricsHistory: list[MetricsSnapshotResponse]
