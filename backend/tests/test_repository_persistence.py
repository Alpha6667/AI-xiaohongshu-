import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.models.enums import AccountSyncStatus, PostStatus, PublishStatus, ReviewStatus
from app.models.metrics_snapshot import MetricsSnapshot
from app.models.post import Post
from app.models.publish_log import PublishLog
from app.main import app
from app.repositories import memory
from app.repositories.memory import InMemoryRepository, now_iso


class RepositoryPersistenceTests(unittest.TestCase):
    def test_save_and_reload_posts(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            storage_path = Path(temp_dir) / "repository.json"
            repo = InMemoryRepository(storage_path=storage_path)

            created_at = now_iso()
            post = Post(
                id="post_persist_test",
                topic="持久化测试",
                title="持久化标题",
                body="持久化正文",
                tags=["test"],
                status=PostStatus.DRAFT,
                created_at=created_at,
                updated_at=created_at,
            )

            repo.posts[post.id] = post
            repo.save()

            reloaded_repo = InMemoryRepository(storage_path=storage_path)
            self.assertIn(post.id, reloaded_repo.posts)
            self.assertEqual(reloaded_repo.posts[post.id].title, "持久化标题")

    def test_reload_published_post_from_camel_case_repository_payload(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            storage_path = Path(temp_dir) / "repository.json"
            captured_at = "2026-05-09T21:18:39.284Z"
            payload = {
                "posts": {
                    "post_real_1": {
                        "id": "post_real_1",
                        "topic": "真实发布",
                        "title": "真实发布标题",
                        "body": "真实发布正文",
                        "tags": ["xhs"],
                        "status": "published",
                        "assetIds": [],
                        "platformPostId": "xh_real_1",
                        "platformUrl": "https://www.xiaohongshu.com/explore/xh_real_1",
                        "reviewStatus": "approved",
                        "likeCount": 38,
                        "collectCount": 12,
                        "commentCount": 8,
                        "lastSyncAt": captured_at,
                        "lastSyncStatus": "succeeded",
                        "syncError": None,
                        "createdAt": captured_at,
                        "updatedAt": captured_at,
                        "publishedAt": captured_at,
                        "publishLogIds": ["publish_real_1"],
                    }
                },
                "assets": {},
                "review_records": {},
                "generation_tasks": {},
                "publish_logs": {
                    "publish_real_1": {
                        "id": "publish_real_1",
                        "postId": "post_real_1",
                        "status": "succeeded",
                        "detail": "发布成功",
                        "createdAt": captured_at,
                        "platformPostId": "xh_real_1",
                    }
                },
                "metrics_snapshots": {
                    "post_real_1": [
                        {
                            "id": "metric_real_1",
                            "postId": "post_real_1",
                            "views": 158,
                            "likes": 38,
                            "favorites": 12,
                            "comments": 8,
                            "followConversions": 2,
                            "snapshotAt": captured_at,
                            "source": "xhs_creator_center",
                            "capturedAt": captured_at,
                        }
                    ]
                },
                "accounts": {},
                "message_tasks": {},
                "inbound_messages": {},
                "image_provider_config": None,
            }
            storage_path.write_text(json.dumps(payload), encoding="utf-8")

            reloaded_repo = InMemoryRepository(storage_path=storage_path)

            self.assertIn("post_real_1", reloaded_repo.posts)
            post = reloaded_repo.posts["post_real_1"]
            self.assertEqual(post.status, PostStatus.PUBLISHED)
            self.assertEqual(post.platform_post_id, "xh_real_1")
            self.assertEqual(post.last_sync_status, AccountSyncStatus.SUCCEEDED)
            self.assertIsNone(post.sync_error)
            self.assertEqual(post.review_status, ReviewStatus.APPROVED)
            self.assertEqual(post.publish_log_ids, ["publish_real_1"])

            publish_log = reloaded_repo.publish_logs["publish_real_1"]
            self.assertEqual(publish_log.status, PublishStatus.SUCCEEDED)
            self.assertEqual(publish_log.platform_post_id, "xh_real_1")

            snapshot = reloaded_repo.metrics_snapshots["post_real_1"][-1]
            self.assertEqual(snapshot.source, "xhs_creator_center")
            self.assertEqual(snapshot.captured_at, captured_at)
            self.assertEqual(snapshot.follow_conversions, 2)

            reloaded_repo.save()
            saved_payload = json.loads(storage_path.read_text(encoding="utf-8"))
            saved_post = saved_payload["posts"]["post_real_1"]
            saved_snapshot = saved_payload["metrics_snapshots"]["post_real_1"][-1]
            self.assertEqual(saved_post["platformPostId"], "xh_real_1")
            self.assertEqual(saved_post["lastSyncStatus"], "succeeded")
            self.assertIsNone(saved_post["syncError"])
            self.assertEqual(saved_snapshot["source"], "xhs_creator_center")
            self.assertEqual(saved_snapshot["capturedAt"], captured_at)

    def test_save_and_reload_published_post_keeps_metrics_source(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            storage_path = Path(temp_dir) / "repository.json"
            repo = InMemoryRepository(storage_path=storage_path)
            created_at = "2026-05-09T21:18:39.284Z"
            post = Post(
                id="post_reload_metrics",
                topic="重启验证",
                title="重启验证标题",
                body="重启验证正文",
                tags=[],
                status=PostStatus.PUBLISHED,
                platform_post_id="xh_reload_1",
                review_status=ReviewStatus.APPROVED,
                last_sync_at=created_at,
                last_sync_status=AccountSyncStatus.SUCCEEDED,
                created_at=created_at,
                updated_at=created_at,
                published_at=created_at,
                publish_log_ids=["publish_reload_metrics"],
            )
            repo.posts[post.id] = post
            repo.publish_logs["publish_reload_metrics"] = PublishLog(
                id="publish_reload_metrics",
                post_id=post.id,
                status=PublishStatus.SUCCEEDED,
                detail="发布成功",
                created_at=created_at,
                platform_post_id="xh_reload_1",
            )
            repo.metrics_snapshots[post.id] = [
                MetricsSnapshot(
                    id="metric_reload_metrics",
                    post_id=post.id,
                    views=158,
                    likes=38,
                    favorites=12,
                    comments=8,
                    follow_conversions=2,
                    snapshot_at=created_at,
                    source="xhs_creator_center",
                    captured_at=created_at,
                )
            ]
            repo.save()

            reloaded_repo = InMemoryRepository(storage_path=storage_path)
            reloaded_post = reloaded_repo.posts[post.id]
            reloaded_snapshot = reloaded_repo.metrics_snapshots[post.id][-1]
            self.assertEqual(reloaded_post.platform_post_id, "xh_reload_1")
            self.assertEqual(reloaded_post.last_sync_status, AccountSyncStatus.SUCCEEDED)
            self.assertEqual(reloaded_snapshot.source, "xhs_creator_center")
            self.assertEqual(reloaded_snapshot.captured_at, created_at)

    def test_api_get_post_after_repository_reload_keeps_latest_metrics(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            storage_path = Path(temp_dir) / "repository.json"
            captured_at = "2026-05-09T21:18:39.284Z"
            repo = InMemoryRepository(storage_path=storage_path)
            repo.posts.clear()
            repo.metrics_snapshots.clear()
            repo.publish_logs.clear()
            repo.posts["post_api_reload"] = Post(
                id="post_api_reload",
                topic="API 重启验证",
                title="API 重启验证标题",
                body="API 重启验证正文",
                tags=[],
                status=PostStatus.PUBLISHED,
                platform_post_id="xh_api_reload",
                review_status=ReviewStatus.APPROVED,
                last_sync_at=captured_at,
                last_sync_status=AccountSyncStatus.SUCCEEDED,
                created_at=captured_at,
                updated_at=captured_at,
                published_at=captured_at,
            )
            repo.metrics_snapshots["post_api_reload"] = [
                MetricsSnapshot(
                    id="metric_api_reload",
                    post_id="post_api_reload",
                    views=158,
                    likes=38,
                    favorites=12,
                    comments=8,
                    follow_conversions=2,
                    snapshot_at=captured_at,
                    source="xhs_creator_center",
                    captured_at=captured_at,
                )
            ]
            repo.save()

            reloaded_repo = InMemoryRepository(storage_path=storage_path)
            with patch.object(memory, "repository", reloaded_repo), patch("app.services.posts.repository", reloaded_repo):
                response = TestClient(app).get("/api/posts/post_api_reload")

            self.assertEqual(response.status_code, 200)
            payload = response.json()
            last_snapshot = payload["metricsHistory"][-1]
            self.assertEqual(payload["platformPostId"], "xh_api_reload")
            self.assertEqual(payload["metricsSource"], "xhs_creator_center")
            self.assertEqual(payload["latestMetrics"], {
                "views": last_snapshot["views"],
                "likes": last_snapshot["likes"],
                "favorites": last_snapshot["favorites"],
                "comments": last_snapshot["comments"],
                "followConversions": last_snapshot["followConversions"],
                "source": last_snapshot["source"],
                "capturedAt": last_snapshot["capturedAt"],
            })


if __name__ == "__main__":
    unittest.main()
