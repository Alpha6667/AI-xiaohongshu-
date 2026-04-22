from typing import Callable

from app.tasks.backend_client import post_backend
from app.tasks.status import TASK_STATUS


def _build_metrics_append_payload(payload: dict[str, object]) -> dict[str, object]:
    return {
        "views": int(payload.get("views", 0)),
        "likes": int(payload.get("likes", 0)),
        "favorites": int(payload.get("favorites", 0)),
        "comments": int(payload.get("comments", 0)),
        "followConversions": int(payload.get("followConversions", 0)),
        "snapshotAt": payload.get("snapshotAt"),
    }


def run_metrics_collection_task(
    task_id: str,
    payload: dict[str, object],
    backend_post: Callable[[str, dict[str, object]], dict[str, object]] | None = None,
) -> dict[str, object]:
    post_fn = backend_post or post_backend
    post_id = str(payload.get("postId", "")).strip()
    if not post_id:
        raise ValueError("metrics collection task payload requires postId")

    append_payload = _build_metrics_append_payload(payload)
    append_payload = {k: v for k, v in append_payload.items() if v is not None}
    append_response = post_fn(f"/api/posts/{post_id}/metrics-snapshots", append_payload)

    return {
        "taskId": task_id,
        "taskType": "metrics_collection",
        "status": TASK_STATUS["SUCCEEDED"],
        "payload": payload,
        "message": "Metrics collection task completed and snapshot appended",
        "writeback": append_response,
    }
