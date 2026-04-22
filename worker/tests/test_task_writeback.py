import unittest

from app.tasks.metrics_collection import run_metrics_collection_task
from app.tasks.publish import run_publish_task


class WorkerTaskWritebackTests(unittest.TestCase):
    def test_publish_task_triggers_auto_writeback(self) -> None:
        calls: list[tuple[str, dict[str, object]]] = []

        def fake_backend_post(path: str, payload: dict[str, object]) -> dict[str, object]:
            calls.append((path, payload))
            return {
                "publishStatus": payload["publishStatus"],
                "platformPostId": payload.get("platformPostId"),
                "errorMessage": payload.get("errorMessage"),
                "failureType": payload.get("failureType"),
            }

        result = run_publish_task(
            "task_publish_auto",
            {
                "postId": "post_test_1",
                "resultType": "rate_limited",
                "operator": "worker",
                "detail": "rate limited by platform",
            },
            backend_post=fake_backend_post,
        )

        self.assertEqual(result["status"], "succeeded")
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0][0], "/api/posts/post_test_1/publish-result")
        self.assertEqual(calls[0][1]["publishStatus"], "failed")
        self.assertEqual(calls[0][1]["failureType"], "rate_limited")

    def test_metrics_task_triggers_auto_append(self) -> None:
        calls: list[tuple[str, dict[str, object]]] = []

        def fake_backend_post(path: str, payload: dict[str, object]) -> dict[str, object]:
            calls.append((path, payload))
            return {
                "id": "metric_auto_1",
                "views": payload["views"],
                "likes": payload["likes"],
            }

        result = run_metrics_collection_task(
            "task_metrics_auto",
            {
                "postId": "post_test_1",
                "views": 321,
                "likes": 28,
                "favorites": 18,
                "comments": 7,
                "followConversions": 3,
            },
            backend_post=fake_backend_post,
        )

        self.assertEqual(result["status"], "succeeded")
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0][0], "/api/posts/post_test_1/metrics-snapshots")
        self.assertEqual(calls[0][1]["views"], 321)
        self.assertEqual(calls[0][1]["likes"], 28)


if __name__ == "__main__":
    unittest.main()
