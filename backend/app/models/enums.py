from enum import StrEnum


class PostStatus(StrEnum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    PUBLISH_FAILED = "publish_failed"


class ReviewAction(StrEnum):
    SUBMIT = "submit"
    APPROVE = "approve"
    REJECT = "reject"


class GenerationTaskType(StrEnum):
    COPY = "generate_copy"
    IMAGE = "generate_images"


class TaskStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class PublishStatus(StrEnum):
    QUEUED = "queued"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class PublishFailureType(StrEnum):
    RETRYABLE = "retryable"
    NON_RETRYABLE = "non_retryable"
    RATE_LIMITED = "rate_limited"


class MessageTaskStage(StrEnum):
    PENDING_GENERATION = "pending_generation"
    COPY_GENERATED = "copy_generated"
    IMAGES_GENERATED = "images_generated"
    WAITING_REVIEW = "waiting_review"
    WAITING_PUBLISH = "waiting_publish"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    FAILED = "failed"


class AccountStatus(StrEnum):
    ONLINE = "online"
    BUSY = "busy"
    OFFLINE = "offline"
