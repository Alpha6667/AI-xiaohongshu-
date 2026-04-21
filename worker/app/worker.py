from app.tasks import (
    run_copy_generation_task,
    run_image_generation_task,
    run_metrics_collection_task,
    run_publish_task,
)


def run_worker() -> None:
    demo_payload = {"source": "placeholder"}
    run_copy_generation_task("task_demo_copy", demo_payload)
    run_image_generation_task("task_demo_image", demo_payload)
    run_publish_task("task_demo_publish", demo_payload)
    run_metrics_collection_task("task_demo_metrics", demo_payload)
    print("Worker placeholders are ready under worker/app/tasks.")


if __name__ == "__main__":
    run_worker()
