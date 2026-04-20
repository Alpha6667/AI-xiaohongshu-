from dataclasses import dataclass

from app.models.enums import GenerationTaskType, TaskStatus


@dataclass(slots=True)
class GenerationTask:
    id: str
    post_id: str
    task_type: GenerationTaskType
    status: TaskStatus
    payload: dict[str, object]
    created_at: str
