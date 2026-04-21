from fastapi import HTTPException, status

from app.models.enums import GenerationTaskType, PostStatus, PublishStatus, ReviewAction, TaskStatus
from app.models.generation_task import GenerationTask
from app.models.post import Post
from app.models.publish_log import PublishLog
from app.models.review_record import ReviewRecord
from app.repositories.memory import new_id, now_iso, repository
from app.schemas.posts import (
    AssetSummaryResponse,
    GenerateTaskRequest,
    MetricsSnapshotResponse,
    PostCreateRequest,
    PostDetailResponse,
    PostMetricsResponse,
    PostSummaryResponse,
    PostUpdateRequest,
    PublishLogResponse,
    PublishResponse,
    ReviewRecordResponse,
    ReviewRequest,
    TaskRecordResponse,
)


def _get_post_or_404(post_id: str) -> Post:
    post = repository.posts.get(post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


def _latest_metrics(post_id: str) -> PostMetricsResponse:
    snapshots = repository.metrics_snapshots.get(post_id, [])
    if not snapshots:
        return PostMetricsResponse(views=0, likes=0, favorites=0, comments=0, followConversions=0)
    snapshot = snapshots[-1]
    return PostMetricsResponse(
        views=snapshot.views,
        likes=snapshot.likes,
        favorites=snapshot.favorites,
        comments=snapshot.comments,
        followConversions=snapshot.follow_conversions,
    )


def _serialize_review_records(post: Post) -> list[ReviewRecordResponse]:
    return [
        ReviewRecordResponse(
            id=record.id,
            action=record.action,
            comment=record.comment,
            operator=record.operator,
            createdAt=record.created_at,
        )
        for record_id in post.review_record_ids
        if (record := repository.review_records.get(record_id)) is not None
    ]


def _serialize_publish_records(post: Post) -> list[PublishLogResponse]:
    return [
        PublishLogResponse(
            id=record.id,
            status=record.status,
            detail=record.detail,
            createdAt=record.created_at,
        )
        for record_id in post.publish_log_ids
        if (record := repository.publish_logs.get(record_id)) is not None
    ]


def _serialize_metrics_history(post: Post) -> list[MetricsSnapshotResponse]:
    return [
        MetricsSnapshotResponse(
            id=snapshot.id,
            snapshotAt=snapshot.snapshot_at,
            views=snapshot.views,
            likes=snapshot.likes,
            favorites=snapshot.favorites,
            comments=snapshot.comments,
            followConversions=snapshot.follow_conversions,
        )
        for snapshot in repository.metrics_snapshots.get(post.id, [])
    ]


def _serialize_assets(post: Post) -> list[AssetSummaryResponse]:
    assets: list[AssetSummaryResponse] = []
    for asset_id in post.asset_ids:
        asset = repository.assets.get(asset_id)
        if asset is None:
            continue
        assets.append(
            AssetSummaryResponse(
                id=asset.id,
                name=asset.name,
                fileName=asset.file_name,
                contentType=asset.content_type,
                url=asset.url,
                createdAt=asset.created_at,
            )
        )
    return assets


def _serialize_post(post: Post) -> PostSummaryResponse:
    return PostSummaryResponse(
        id=post.id,
        topic=post.topic,
        title=post.title,
        body=post.body,
        tags=post.tags,
        status=post.status,
        assetIds=post.asset_ids,
        latestTaskIds=post.generation_task_ids[-3:],
        latestMetrics=_latest_metrics(post.id),
        platformPostId=post.platform_post_id,
        createdAt=post.created_at,
        updatedAt=post.updated_at,
        publishedAt=post.published_at,
    )


def list_posts() -> list[PostSummaryResponse]:
    posts = sorted(repository.posts.values(), key=lambda item: item.updated_at, reverse=True)
    return [_serialize_post(post) for post in posts]


def get_post_detail(post_id: str) -> PostDetailResponse:
    post = _get_post_or_404(post_id)
    summary = _serialize_post(post)
    return PostDetailResponse(
        **summary.model_dump(),
        assets=_serialize_assets(post),
        reviewRecords=_serialize_review_records(post),
        publishRecords=_serialize_publish_records(post),
        metricsHistory=_serialize_metrics_history(post),
    )


def create_post(payload: PostCreateRequest) -> PostSummaryResponse:
    timestamp = now_iso()
    post = Post(
        id=new_id("post"),
        topic=payload.topic,
        title=payload.title,
        body=payload.body,
        tags=payload.tags,
        status=PostStatus.DRAFT,
        asset_ids=payload.assetIds,
        created_at=timestamp,
        updated_at=timestamp,
    )
    repository.posts[post.id] = post
    repository.save()
    return _serialize_post(post)


def update_post(post_id: str, payload: PostUpdateRequest) -> PostSummaryResponse:
    post = _get_post_or_404(post_id)
    changes = payload.model_dump(exclude_none=True)
    if "topic" in changes:
        post.topic = changes["topic"]
    if "title" in changes:
        post.title = changes["title"]
    if "body" in changes:
        post.body = changes["body"]
    if "tags" in changes:
        post.tags = changes["tags"]
    if "assetIds" in changes:
        post.asset_ids = changes["assetIds"]
    post.updated_at = now_iso()
    repository.save()
    return _serialize_post(post)


def _add_review_record(post: Post, action: ReviewAction, request: ReviewRequest) -> ReviewRecordResponse:
    review = ReviewRecord(
        id=new_id("review"),
        post_id=post.id,
        action=action,
        comment=request.comment,
        operator=request.operator,
        created_at=now_iso(),
    )
    repository.review_records[review.id] = review
    post.review_record_ids.append(review.id)
    post.updated_at = review.created_at
    repository.save()
    return ReviewRecordResponse(
        id=review.id,
        action=review.action,
        comment=review.comment,
        operator=review.operator,
        createdAt=review.created_at,
    )


def submit_review(post_id: str, request: ReviewRequest) -> PostDetailResponse:
    post = _get_post_or_404(post_id)
    if post.status != PostStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only draft posts can be submitted for review")
    post.status = PostStatus.IN_REVIEW
    _add_review_record(post, ReviewAction.SUBMIT, request)
    return get_post_detail(post_id)


def approve_post(post_id: str, request: ReviewRequest) -> PostDetailResponse:
    post = _get_post_or_404(post_id)
    if post.status != PostStatus.IN_REVIEW:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only in_review posts can be approved")
    post.status = PostStatus.APPROVED
    _add_review_record(post, ReviewAction.APPROVE, request)
    return get_post_detail(post_id)


def reject_post(post_id: str, request: ReviewRequest) -> PostDetailResponse:
    post = _get_post_or_404(post_id)
    if post.status != PostStatus.IN_REVIEW:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only in_review posts can be rejected")
    post.status = PostStatus.DRAFT
    _add_review_record(post, ReviewAction.REJECT, request)
    return get_post_detail(post_id)


def create_generation_task(post_id: str, task_type: GenerationTaskType, request: GenerateTaskRequest) -> TaskRecordResponse:
    post = _get_post_or_404(post_id)
    task = GenerationTask(
        id=new_id("task"),
        post_id=post.id,
        task_type=task_type,
        status=TaskStatus.PENDING,
        payload={"operator": request.operator, **request.payload},
        created_at=now_iso(),
    )
    repository.generation_tasks[task.id] = task
    post.generation_task_ids.append(task.id)
    post.updated_at = task.created_at
    repository.save()
    return TaskRecordResponse(
        taskId=task.id,
        postId=post.id,
        status=task.status,
        taskType=task.task_type,
        createdAt=task.created_at,
        message="Task accepted and queued for worker execution",
    )


def publish_post(post_id: str, request: ReviewRequest) -> PublishResponse:
    post = _get_post_or_404(post_id)
    if post.status != PostStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only approved posts can enter publishing")
    if any(
        repository.publish_logs[log_id].status in {PublishStatus.QUEUED, PublishStatus.SUCCEEDED}
        for log_id in post.publish_log_ids
        if log_id in repository.publish_logs
    ):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Publish already queued or completed")

    created_at = now_iso()
    log = PublishLog(
        id=new_id("publish"),
        post_id=post.id,
        status=PublishStatus.QUEUED,
        detail=f"Publish requested by {request.operator}",
        created_at=created_at,
    )
    repository.publish_logs[log.id] = log
    post.publish_log_ids.append(log.id)
    post.status = PostStatus.PUBLISHING
    post.updated_at = created_at
    repository.save()
    return PublishResponse(
        publishLogId=log.id,
        postId=post.id,
        status=post.status,
        publishStatus=log.status,
        detail=log.detail,
        createdAt=log.created_at,
        message="Publish request accepted and queued",
    )
