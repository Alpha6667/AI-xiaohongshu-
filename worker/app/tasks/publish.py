from app.tasks.status import TASK_STATUS


def run_publish_task(task_id: str, payload: dict[str, object]) -> dict[str, object]:
    return {
        "taskId": task_id,
        "taskType": "publish",
        "status": TASK_STATUS["PENDING"],
        "payload": payload,
        "message": "Publish task placeholder",
    }
