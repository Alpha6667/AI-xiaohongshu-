from fastapi import APIRouter

from app.schemas.tasks import MessageTaskResponse
from app.services.tasks import list_message_tasks


router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[MessageTaskResponse])
def list_tasks_route() -> list[MessageTaskResponse]:
    return list_message_tasks()
