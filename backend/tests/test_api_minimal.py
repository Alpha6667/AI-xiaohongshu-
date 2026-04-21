import unittest

from fastapi.testclient import TestClient

from app.main import app
from app.repositories.memory import repository


def reset_repository() -> None:
    repository.posts.clear()
    repository.assets.clear()
    repository.review_records.clear()
    repository.generation_tasks.clear()
    repository.publish_logs.clear()
    repository.metrics_snapshots.clear()
    repository._seed()


class BackendApiMinimalTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_repository()
        self.client = TestClient(app)

    def test_post_crud_and_detail_fields(self) -> None:
        create_resp = self.client.post(
            "/api/posts",
            json={
                "topic": "联调测试主题",
                "title": "联调测试标题",
                "body": "联调测试正文",
                "tags": ["tag-a"],
                "assetIds": [],
            },
        )
        self.assertEqual(create_resp.status_code, 201)
        post_id = create_resp.json()["id"]

        list_resp = self.client.get("/api/posts")
        self.assertEqual(list_resp.status_code, 200)
        self.assertTrue(any(item["id"] == post_id for item in list_resp.json()))

        update_resp = self.client.patch(
            f"/api/posts/{post_id}",
            json={"title": "联调更新标题", "tags": ["tag-a", "tag-b"]},
        )
        self.assertEqual(update_resp.status_code, 200)
        self.assertEqual(update_resp.json()["title"], "联调更新标题")

        detail_resp = self.client.get(f"/api/posts/{post_id}")
        self.assertEqual(detail_resp.status_code, 200)
        detail = detail_resp.json()
        self.assertIn("reviewRecords", detail)
        self.assertIn("publishRecords", detail)
        self.assertIn("metricsHistory", detail)

    def test_review_flow(self) -> None:
        create_resp = self.client.post(
            "/api/posts",
            json={
                "topic": "审核流转",
                "title": "审核流转标题",
                "body": "审核流转正文",
                "tags": [],
                "assetIds": [],
            },
        )
        post_id = create_resp.json()["id"]

        submit_resp = self.client.post(
            f"/api/posts/{post_id}/submit-review",
            json={"comment": "提交审核", "operator": "qa"},
        )
        self.assertEqual(submit_resp.status_code, 200)
        self.assertEqual(submit_resp.json()["status"], "in_review")

        reject_resp = self.client.post(
            f"/api/posts/{post_id}/reject",
            json={"comment": "退回修改", "operator": "qa"},
        )
        self.assertEqual(reject_resp.status_code, 200)
        self.assertEqual(reject_resp.json()["status"], "draft")

        submit_resp_2 = self.client.post(
            f"/api/posts/{post_id}/submit-review",
            json={"comment": "再次提交", "operator": "qa"},
        )
        self.assertEqual(submit_resp_2.status_code, 200)

        approve_resp = self.client.post(
            f"/api/posts/{post_id}/approve",
            json={"comment": "审核通过", "operator": "qa"},
        )
        self.assertEqual(approve_resp.status_code, 200)
        self.assertEqual(approve_resp.json()["status"], "approved")

    def test_publish_status_validation(self) -> None:
        not_allowed_resp = self.client.post(
            "/api/posts/post_seed_draft/publish",
            json={"comment": "尝试发布", "operator": "qa"},
        )
        self.assertEqual(not_allowed_resp.status_code, 409)

        approved_post_resp = self.client.post(
            "/api/posts",
            json={
                "topic": "发布校验",
                "title": "发布校验标题",
                "body": "发布校验正文",
                "tags": [],
                "assetIds": [],
            },
        )
        approved_post_id = approved_post_resp.json()["id"]
        self.client.post(
            f"/api/posts/{approved_post_id}/submit-review",
            json={"comment": "提交", "operator": "qa"},
        )
        self.client.post(
            f"/api/posts/{approved_post_id}/approve",
            json={"comment": "通过", "operator": "qa"},
        )

        publish_resp = self.client.post(
            f"/api/posts/{approved_post_id}/publish",
            json={"comment": "进入发布", "operator": "qa"},
        )
        self.assertEqual(publish_resp.status_code, 200)
        self.assertEqual(publish_resp.json()["status"], "publishing")

    def test_asset_upload_with_post_id_association(self) -> None:
        create_resp = self.client.post(
            "/api/posts",
            json={
                "topic": "素材关联",
                "title": "素材关联标题",
                "body": "素材关联正文",
                "tags": [],
                "assetIds": [],
            },
        )
        self.assertEqual(create_resp.status_code, 201)
        post_id = create_resp.json()["id"]

        upload_resp = self.client.post(
            "/api/assets/upload",
            json={
                "name": "主图",
                "fileName": "cover.jpg",
                "contentType": "image/jpeg",
                "postId": post_id,
            },
        )
        self.assertEqual(upload_resp.status_code, 201)
        asset_id = upload_resp.json()["id"]

        detail_resp = self.client.get(f"/api/posts/{post_id}")
        self.assertEqual(detail_resp.status_code, 200)
        self.assertIn(asset_id, detail_resp.json()["assetIds"])

    def test_dashboard_summary_fields_stable(self) -> None:
        summary_resp = self.client.get("/api/dashboard/summary")
        self.assertEqual(summary_resp.status_code, 200)

        payload = summary_resp.json()
        expected_keys = {
            "totalPosts",
            "totalViews",
            "totalLikes",
            "totalFavorites",
            "totalComments",
            "followConversions",
            "pendingReviewCount",
            "publishedCount",
        }
        self.assertEqual(set(payload.keys()), expected_keys)


if __name__ == "__main__":
    unittest.main()
