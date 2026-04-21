from app.tasks.status import TASK_STATUS


def run_metrics_collection_task(task_id: str, payload: dict[str, object]) -> dict[str, object]:
    return {
        "taskId": task_id,
        "taskType": "metrics_collection",
        "status": TASK_STATUS["PENDING"],
        "payload": payload,
        "message": "Metrics collection task placeholder",
    }
