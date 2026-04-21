from app.tasks.status import TASK_STATUS


def run_image_generation_task(task_id: str, payload: dict[str, object]) -> dict[str, object]:
    return {
        "taskId": task_id,
        "taskType": "generate_images",
        "status": TASK_STATUS["PENDING"],
        "payload": payload,
        "message": "Image generation task placeholder",
    }
