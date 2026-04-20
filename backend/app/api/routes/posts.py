from fastapi import APIRouter, status

from app.models.enums import GenerationTaskType
from app.schemas.posts import (
    GenerateTaskRequest,
    PostCreateRequest,
    PostDetailResponse,
    PostSummaryResponse,
    PostUpdateRequest,
    PublishResponse,
    ReviewRequest,
    TaskRecordResponse,
)
from app.services.posts import (
    approve_post,
    create_generation_task,
    create_post,
    get_post_detail,
    list_posts,
    publish_post,
    reject_post,
    submit_review,
    update_post,
)


router = APIRouter(prefix="/api/posts", tags=["posts"])


@router.post("", response_model=PostSummaryResponse, status_code=status.HTTP_201_CREATED)
def create_post_route(payload: PostCreateRequest) -> PostSummaryResponse:
    return create_post(payload)


@router.get("", response_model=list[PostSummaryResponse])
def list_posts_route() -> list[PostSummaryResponse]:
    return list_posts()


@router.get("/{post_id}", response_model=PostDetailResponse)
def get_post_detail_route(post_id: str) -> PostDetailResponse:
    return get_post_detail(post_id)


@router.patch("/{post_id}", response_model=PostSummaryResponse)
def update_post_route(post_id: str, payload: PostUpdateRequest) -> PostSummaryResponse:
    return update_post(post_id, payload)


@router.post("/{post_id}/submit-review", response_model=PostDetailResponse)
def submit_review_route(post_id: str, payload: ReviewRequest) -> PostDetailResponse:
    return submit_review(post_id, payload)


@router.post("/{post_id}/approve", response_model=PostDetailResponse)
def approve_post_route(post_id: str, payload: ReviewRequest) -> PostDetailResponse:
    return approve_post(post_id, payload)


@router.post("/{post_id}/reject", response_model=PostDetailResponse)
def reject_post_route(post_id: str, payload: ReviewRequest) -> PostDetailResponse:
    return reject_post(post_id, payload)


@router.post("/{post_id}/generate-copy", response_model=TaskRecordResponse)
def generate_copy_route(post_id: str, payload: GenerateTaskRequest) -> TaskRecordResponse:
    return create_generation_task(post_id, GenerationTaskType.COPY, payload)


@router.post("/{post_id}/generate-images", response_model=TaskRecordResponse)
def generate_images_route(post_id: str, payload: GenerateTaskRequest) -> TaskRecordResponse:
    return create_generation_task(post_id, GenerationTaskType.IMAGE, payload)


@router.post("/{post_id}/publish", response_model=PublishResponse)
def publish_post_route(post_id: str, payload: ReviewRequest) -> PublishResponse:
    return publish_post(post_id, payload)
