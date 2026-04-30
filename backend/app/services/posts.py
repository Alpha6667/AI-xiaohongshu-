from fastapi import HTTPException, status

from app.models.asset import Asset
from app.models.enums import (
    AccountSyncStatus,
    GenerationTaskType,
    MessageTaskStage,
    PostStatus,
    PublishFailureType,
    PublishStatus,
    ReviewAction,
    ReviewStatus,
    TaskStatus,
)
from app.models.generation_task import GenerationTask
from app.models.metrics_snapshot import MetricsSnapshot
from app.models.post import Post
from app.models.publish_log import PublishLog
from app.models.review_record import ReviewRecord
from app.repositories.memory import new_id, now_iso, repository
from app.schemas.posts import (
    AssetSummaryResponse,
    GenerateTaskRequest,
    MetricsSnapshotAppendRequest,
    MetricsSnapshotResponse,
    OpenClawPublishExecuteRequest,
    PostCreateRequest,
    PostDetailResponse,
    PostMetricsResponse,
    PublishResultWritebackRequest,
    PostSummaryResponse,
    PostUpdateRequest,
    PublishLogResponse,
    PublishResponse,
    ReviewRecordResponse,
    ReviewRequest,
    TaskRecordResponse,
)
from app.services.publisher import PreparedPublish, publisher_adapter
from app.services.image_provider import ProviderNotConfiguredError, prepare_image_provider_for_generation


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


def _derive_review_status(post: Post) -> ReviewStatus:
    if post.review_status != ReviewStatus.UNKNOWN:
        return post.review_status
    if post.status == PostStatus.UNDER_REVIEW:
        return ReviewStatus.UNDER_REVIEW
    if post.status == PostStatus.REJECTED:
        return ReviewStatus.REJECTED
    if post.status in {PostStatus.APPROVED, PostStatus.PUBLISHED}:
        return ReviewStatus.APPROVED
    if post.status in {PostStatus.DRAFT, PostStatus.IN_REVIEW}:
        return ReviewStatus.PENDING
    return ReviewStatus.UNKNOWN


def _latest_interaction_counts(post: Post) -> tuple[int | None, int | None, int | None]:
    latest_metrics = _latest_metrics(post.id)
    return (
        post.like_count if post.like_count is not None else latest_metrics.likes,
        post.collect_count if post.collect_count is not None else latest_metrics.favorites,
        post.comment_count if post.comment_count is not None else latest_metrics.comments,
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
            executionId=record.id,
            platformPostId=record.platform_post_id,
            errorMessage=record.error_message,
            failureType=record.failure_type,
            executionLogs=[record.detail],
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
    latest_metrics = _latest_metrics(post.id)
    like_count, collect_count, comment_count = _latest_interaction_counts(post)
    message_task = _get_message_task_by_post(post)
    return PostSummaryResponse(
        id=post.id,
        topic=post.topic,
        title=post.title,
        body=post.body,
        tags=post.tags,
        status=post.status,
        assetIds=post.asset_ids,
        latestTaskIds=post.generation_task_ids[-3:],
        latestMetrics=latest_metrics,
        platformPostId=post.platform_post_id,
        platformUrl=post.platform_url,
        accountId=post.account_id,
        accountName=(repository.accounts[post.account_id].name if post.account_id and post.account_id in repository.accounts else None),
        messageTaskId=post.message_task_id,
        reviewStatus=_derive_review_status(post),
        likeCount=like_count,
        collectCount=collect_count,
        commentCount=comment_count,
        lastSyncAt=post.last_sync_at,
        lastSyncStatus=post.last_sync_status,
        syncError=post.sync_error,
        sourceMessage=message_task.source_message if message_task is not None else None,
        confirmationSource=("web" if post.review_record_ids else "openclaw"),
        confirmationSourceLabel=("当前以网页确认版为准" if post.review_record_ids else "当前以 OpenClaw 最新生成结果为准"),
        createdAt=post.created_at,
        updatedAt=post.updated_at,
        publishedAt=post.published_at,
    )


def _get_message_task_by_post(post: Post):
    if post.message_task_id is not None:
        task = repository.message_tasks.get(post.message_task_id)
        if task is not None:
            return task
    for task in repository.message_tasks.values():
        if task.post_id == post.id:
            if post.message_task_id != task.id:
                post.message_task_id = task.id
            return task
    return None


def _sync_message_task_generation_state(post: Post, *, copy_generated: bool = False, images_generated: bool = False) -> None:
    task = _get_message_task_by_post(post)
    if task is None:
        return

    now = now_iso()
    task.post_id = post.id
    post.message_task_id = task.id

    if copy_generated:
        task.has_copy = True
    if images_generated:
        task.has_images = True

    if task.has_copy and task.has_images:
        task.stage = MessageTaskStage.WAITING_REVIEW
    elif task.has_copy:
        task.stage = MessageTaskStage.COPY_GENERATED
    elif task.has_images:
        task.stage = MessageTaskStage.IMAGES_GENERATED
    else:
        task.stage = MessageTaskStage.PENDING_GENERATION

    task.requires_human_review = task.stage in {
        MessageTaskStage.WAITING_REVIEW,
        MessageTaskStage.WAITING_PUBLISH,
    }
    task.updated_at = now
    post.updated_at = now


def _apply_generated_copy(post: Post) -> None:
    if post.body.startswith("【自动生成文案】"):
        return
    generated_body = f"【自动生成文案】\n主题：{post.topic}\n\n内容：{post.body.strip() or post.topic}"
    post.body = generated_body


def _apply_generated_images(post: Post) -> None:
    if any(
        (asset := repository.assets.get(asset_id)) is not None and asset.name.startswith("自动配图-")
        for asset_id in post.asset_ids
    ):
        return

    created_at = now_iso()
    asset = Asset(
        id=new_id("asset"),
        name=f"自动配图-{post.topic[:12]}",
        file_name=f"{post.id}-generated-cover.png",
        content_type="image/png",
        url=f"https://example.com/assets/{post.id}-generated-cover.png",
        created_at=created_at,
    )
    repository.assets[asset.id] = asset
    post.asset_ids.append(asset.id)


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
        account_id=payload.accountId,
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
    if "accountId" in changes:
        post.account_id = changes["accountId"]
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
    post.review_status = ReviewStatus.PENDING
    _add_review_record(post, ReviewAction.SUBMIT, request)
    return get_post_detail(post_id)


def approve_post(post_id: str, request: ReviewRequest) -> PostDetailResponse:
    post = _get_post_or_404(post_id)
    if post.status != PostStatus.IN_REVIEW:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only in_review posts can be approved")
    post.status = PostStatus.APPROVED
    post.review_status = ReviewStatus.APPROVED
    _add_review_record(post, ReviewAction.APPROVE, request)
    return get_post_detail(post_id)


def reject_post(post_id: str, request: ReviewRequest) -> PostDetailResponse:
    post = _get_post_or_404(post_id)
    if post.status != PostStatus.IN_REVIEW:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only in_review posts can be rejected")
    post.status = PostStatus.DRAFT
    post.review_status = ReviewStatus.PENDING
    _add_review_record(post, ReviewAction.REJECT, request)
    return get_post_detail(post_id)


def create_generation_task(post_id: str, task_type: GenerationTaskType, request: GenerateTaskRequest) -> TaskRecordResponse:
    post = _get_post_or_404(post_id)
    created_at = now_iso()
    task = GenerationTask(
        id=new_id("task"),
        post_id=post.id,
        task_type=task_type,
        status=TaskStatus.PENDING,
        payload={"operator": request.operator, **request.payload},
        created_at=created_at,
    )
    repository.generation_tasks[task.id] = task
    post.generation_task_ids.append(task.id)

    if task_type == GenerationTaskType.COPY:
        _apply_generated_copy(post)
        _sync_message_task_generation_state(post, copy_generated=True)
    if task_type == GenerationTaskType.IMAGE:
        try:
            prepare_image_provider_for_generation()
        except ProviderNotConfiguredError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc
        _apply_generated_images(post)
        _sync_message_task_generation_state(post, images_generated=True)

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
    prepared = publisher_adapter.prepare_publish(post, request.operator)
    prepared = publisher_adapter.submit_publish(prepared, request.operator)
    repository.save()
    return PublishResponse(
        publishLogId=prepared.publish_log.id,
        postId=prepared.post.id,
        status=prepared.post.status,
        publishStatus=prepared.publish_log.status,
        detail=prepared.publish_log.detail,
        createdAt=prepared.publish_log.created_at,
        message="Publish request accepted and queued",
        executionId=prepared.publish_log.id,
        platformPostId=prepared.publish_log.platform_post_id,
        publishedAt=prepared.post.published_at,
        errorMessage=prepared.publish_log.error_message,
        failureType=prepared.publish_log.failure_type,
        executionLogs=[prepared.publish_log.detail],
    )


def _serialize_publish_response(post: Post, log: PublishLog, message: str) -> PublishResponse:
    return PublishResponse(
        publishLogId=log.id,
        postId=post.id,
        status=post.status,
        publishStatus=log.status,
        detail=log.detail,
        createdAt=log.created_at,
        message=message,
        executionId=log.id,
        platformPostId=log.platform_post_id,
        publishedAt=post.published_at,
        errorMessage=log.error_message,
        failureType=log.failure_type,
        executionLogs=[log.detail],
    )


def _prepare_or_reuse_publish(post: Post, operator: str) -> PreparedPublish:
    if post.status == PostStatus.APPROVED:
        return publisher_adapter.submit_publish(publisher_adapter.prepare_publish(post, operator), operator)
    if post.status == PostStatus.PUBLISHING:
        return PreparedPublish(post=post, publish_log=_get_latest_publish_log(post))
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Post is not ready for OpenClaw publish execution")


def execute_openclaw_publish(post_id: str, payload: OpenClawPublishExecuteRequest) -> PublishResponse:
    post = _get_post_or_404(post_id)
    prepared = _prepare_or_reuse_publish(post, payload.operator)

    if payload.simulateResult == "none":
        repository.save()
        return _serialize_publish_response(prepared.post, prepared.publish_log, "OpenClaw publish submitted")

    writeback_payload = PublishResultWritebackRequest(
        publishStatus=PublishStatus(payload.simulateResult),
        operator=payload.operator,
        detail=payload.detail,
        platformPostId=payload.platformPostId,
        errorMessage=payload.errorMessage,
        failureType=payload.failureType,
    )
    return writeback_publish_result(post_id, writeback_payload)


def _get_latest_publish_log(post: Post) -> PublishLog:
    for log_id in reversed(post.publish_log_ids):
        log = repository.publish_logs.get(log_id)
        if log is not None:
            return log
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Publish log not found for post")


def writeback_publish_result(post_id: str, payload: PublishResultWritebackRequest) -> PublishResponse:
    post = _get_post_or_404(post_id)
    if post.status != PostStatus.PUBLISHING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only publishing posts can write back result")
    if payload.publishStatus == PublishStatus.QUEUED:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Writeback status cannot be queued")

    log = _get_latest_publish_log(post)
    if log.status != PublishStatus.QUEUED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Latest publish log is not queued")

    detail = payload.detail.strip() if payload.detail.strip() else f"Publish result from {payload.operator}"
    log.detail = detail
    log.status = payload.publishStatus

    if payload.publishStatus == PublishStatus.SUCCEEDED:
        post.status = PostStatus.PUBLISHED
        post.review_status = ReviewStatus.APPROVED
        post.published_at = now_iso()
        if payload.platformPostId is not None:
            post.platform_post_id = payload.platformPostId
            post.platform_url = f"https://www.xiaohongshu.com/explore/{payload.platformPostId}"
            log.platform_post_id = payload.platformPostId
        log.error_message = None
        log.failure_type = None
    else:
        post.status = PostStatus.PUBLISH_FAILED
        log.error_message = payload.errorMessage or payload.detail or "Publish failed"
        log.platform_post_id = None
        log.failure_type = payload.failureType or PublishFailureType.NON_RETRYABLE

    post.updated_at = now_iso()
    repository.save()
    return PublishResponse(
        publishLogId=log.id,
        postId=post.id,
        status=post.status,
        publishStatus=log.status,
        detail=log.detail,
        createdAt=log.created_at,
        message="Publish result writeback completed",
        executionId=log.id,
        platformPostId=log.platform_post_id,
        publishedAt=post.published_at,
        errorMessage=log.error_message,
        failureType=log.failure_type,
        executionLogs=[log.detail],
    )


def append_metrics_snapshot(post_id: str, payload: MetricsSnapshotAppendRequest) -> MetricsSnapshotResponse:
    post = _get_post_or_404(post_id)
    timestamp = payload.snapshotAt or now_iso()
    snapshot = MetricsSnapshot(
        id=new_id("metric"),
        post_id=post.id,
        views=payload.views,
        likes=payload.likes,
        favorites=payload.favorites,
        comments=payload.comments,
        follow_conversions=payload.followConversions,
        snapshot_at=timestamp,
    )
    history = repository.metrics_snapshots.setdefault(post.id, [])
    history.append(snapshot)
    post.like_count = snapshot.likes
    post.collect_count = snapshot.favorites
    post.comment_count = snapshot.comments
    post.last_sync_at = timestamp
    post.last_sync_status = AccountSyncStatus.SUCCEEDED
    post.sync_error = None
    post.updated_at = now_iso()
    repository.save()
    return MetricsSnapshotResponse(
        id=snapshot.id,
        snapshotAt=snapshot.snapshot_at,
        views=snapshot.views,
        likes=snapshot.likes,
        favorites=snapshot.favorites,
        comments=snapshot.comments,
        followConversions=snapshot.follow_conversions,
    )
    OpenClawPublishExecuteRequest,
