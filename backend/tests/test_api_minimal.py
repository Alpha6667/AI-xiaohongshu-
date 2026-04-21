import unittest

from fastapi.testclient import TestClient

from app.main import app
from app.repositories.memory import repository


def reset_repository() -> None:
    repository.reset_to_seed()


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
        self.assertIn("assets", detail)
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
        self.assertTrue(any(item["id"] == asset_id for item in detail_resp.json()["assets"]))

        post_asset_list_resp = self.client.get(f"/api/assets?postId={post_id}")
        self.assertEqual(post_asset_list_resp.status_code, 200)
        self.assertTrue(any(item["id"] == asset_id for item in post_asset_list_resp.json()))

    def test_generate_and_publish_contract_stable(self) -> None:
        create_resp = self.client.post(
            "/api/posts",
            json={
                "topic": "任务入口契约",
                "title": "任务入口契约标题",
                "body": "任务入口契约正文",
                "tags": [],
                "assetIds": [],
            },
        )
        self.assertEqual(create_resp.status_code, 201)
        post_id = create_resp.json()["id"]

        copy_resp = self.client.post(
            f"/api/posts/{post_id}/generate-copy",
            json={"operator": "qa", "payload": {"tone": "warm"}},
        )
        self.assertEqual(copy_resp.status_code, 200)
        copy_payload = copy_resp.json()
        self.assertEqual(copy_payload["status"], "pending")
        self.assertEqual(copy_payload["taskType"], "generate_copy")
        self.assertIn("message", copy_payload)

        image_resp = self.client.post(
            f"/api/posts/{post_id}/generate-images",
            json={"operator": "qa", "payload": {"style": "minimal"}},
        )
        self.assertEqual(image_resp.status_code, 200)
        image_payload = image_resp.json()
        self.assertEqual(image_payload["status"], "pending")
        self.assertEqual(image_payload["taskType"], "generate_images")
        self.assertIn("message", image_payload)

        self.client.post(
            f"/api/posts/{post_id}/submit-review",
            json={"comment": "提交", "operator": "qa"},
        )
        self.client.post(
            f"/api/posts/{post_id}/approve",
            json={"comment": "通过", "operator": "qa"},
        )

        publish_resp = self.client.post(
            f"/api/posts/{post_id}/publish",
            json={"comment": "进入发布", "operator": "qa"},
        )
        self.assertEqual(publish_resp.status_code, 200)
        publish_payload = publish_resp.json()
        self.assertEqual(publish_payload["status"], "publishing")
        self.assertEqual(publish_payload["publishStatus"], "queued")
        self.assertIn("message", publish_payload)

        publish_repeat_resp = self.client.post(
            f"/api/posts/{post_id}/publish",
            json={"comment": "重复发布", "operator": "qa"},
        )
        self.assertEqual(publish_repeat_resp.status_code, 409)

    def test_publish_result_writeback_success_and_failed(self) -> None:
        create_resp = self.client.post(
            "/api/posts",
            json={
                "topic": "发布结果回写",
                "title": "发布结果回写标题",
                "body": "发布结果回写正文",
                "tags": [],
                "assetIds": [],
            },
        )
        self.assertEqual(create_resp.status_code, 201)
        post_id = create_resp.json()["id"]

        self.client.post(
            f"/api/posts/{post_id}/submit-review",
            json={"comment": "提交", "operator": "qa"},
        )
        self.client.post(
            f"/api/posts/{post_id}/approve",
            json={"comment": "通过", "operator": "qa"},
        )

        publish_resp = self.client.post(
            f"/api/posts/{post_id}/publish",
            json={"comment": "进入发布", "operator": "qa"},
        )
        self.assertEqual(publish_resp.status_code, 200)

        writeback_success_resp = self.client.post(
            f"/api/posts/{post_id}/publish-result",
            json={
                "publishStatus": "succeeded",
                "operator": "worker",
                "detail": "发布成功",
                "platformPostId": "xh_new_1001",
            },
        )
        self.assertEqual(writeback_success_resp.status_code, 200)
        success_payload = writeback_success_resp.json()
        self.assertEqual(success_payload["status"], "published")
        self.assertEqual(success_payload["publishStatus"], "succeeded")
        self.assertEqual(success_payload["platformPostId"], "xh_new_1001")

        detail_after_success = self.client.get(f"/api/posts/{post_id}").json()
        self.assertEqual(detail_after_success["status"], "published")
        self.assertEqual(detail_after_success["platformPostId"], "xh_new_1001")

        failed_post_resp = self.client.post(
            "/api/posts",
            json={
                "topic": "发布失败回写",
                "title": "发布失败标题",
                "body": "发布失败正文",
                "tags": [],
                "assetIds": [],
            },
        )
        failed_post_id = failed_post_resp.json()["id"]
        self.client.post(
            f"/api/posts/{failed_post_id}/submit-review",
            json={"comment": "提交", "operator": "qa"},
        )
        self.client.post(
            f"/api/posts/{failed_post_id}/approve",
            json={"comment": "通过", "operator": "qa"},
        )
        self.client.post(
            f"/api/posts/{failed_post_id}/publish",
            json={"comment": "进入发布", "operator": "qa"},
        )

        writeback_failed_resp = self.client.post(
            f"/api/posts/{failed_post_id}/publish-result",
            json={
                "publishStatus": "failed",
                "operator": "worker",
                "detail": "发布失败",
                "errorMessage": "platform timeout",
            },
        )
        self.assertEqual(writeback_failed_resp.status_code, 200)
        failed_payload = writeback_failed_resp.json()
        self.assertEqual(failed_payload["status"], "publish_failed")
        self.assertEqual(failed_payload["publishStatus"], "failed")
        self.assertEqual(failed_payload["errorMessage"], "platform timeout")

    def test_append_metrics_snapshot_keeps_history(self) -> None:
        before_detail_resp = self.client.get("/api/posts/post_seed_published")
        self.assertEqual(before_detail_resp.status_code, 200)
        before_history = before_detail_resp.json()["metricsHistory"]
        before_count = len(before_history)

        append_resp = self.client.post(
            "/api/posts/post_seed_published/metrics-snapshots",
            json={
                "views": 19000,
                "likes": 1400,
                "favorites": 900,
                "comments": 130,
                "followConversions": 101,
            },
        )
        self.assertEqual(append_resp.status_code, 201)
        self.assertEqual(append_resp.json()["views"], 19000)

        after_detail_resp = self.client.get("/api/posts/post_seed_published")
        self.assertEqual(after_detail_resp.status_code, 200)
        after_history = after_detail_resp.json()["metricsHistory"]
        self.assertEqual(len(after_history), before_count + 1)
        self.assertEqual(after_history[-1]["views"], 19000)

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
