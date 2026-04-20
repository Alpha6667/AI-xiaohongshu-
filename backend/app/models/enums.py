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
