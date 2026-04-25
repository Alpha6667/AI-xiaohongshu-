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

    def test_accounts_and_works_sync_contract(self) -> None:
        list_resp = self.client.get("/api/accounts")
        self.assertEqual(list_resp.status_code, 200)
        accounts = list_resp.json()
        self.assertGreaterEqual(len(accounts), 1)
        first_account = accounts[0]
        self.assertIn("connectionStatus", first_account)
        self.assertIn("lastSyncAt", first_account)
        self.assertIn("lastSyncStatus", first_account)

        works_resp = self.client.get(f"/api/accounts/{first_account['id']}/works-sync")
        self.assertEqual(works_resp.status_code, 200)
        works_payload = works_resp.json()
        self.assertEqual(works_payload["accountId"], first_account["id"])
        self.assertIn("works", works_payload)

        trigger_resp = self.client.post(f"/api/accounts/{first_account['id']}/works-sync")
        self.assertEqual(trigger_resp.status_code, 200)
        trigger_payload = trigger_resp.json()
        self.assertEqual(trigger_payload["accountId"], first_account["id"])
        self.assertIn(trigger_payload["lastSyncStatus"], {"succeeded", "failed"})

    def test_confirmations_contract(self) -> None:
        list_resp = self.client.get("/api/confirmations")
        self.assertEqual(list_resp.status_code, 200)
        confirmations = list_resp.json()
        self.assertGreaterEqual(len(confirmations), 1)
        first_confirmation = confirmations[0]
        self.assertEqual(first_confirmation["postId"], first_confirmation["id"])
        self.assertIn("confirmationSource", first_confirmation)
        self.assertIn("platformUrl", first_confirmation)

        detail_resp = self.client.get(f"/api/confirmations/{first_confirmation['id']}")
        self.assertEqual(detail_resp.status_code, 200)
        detail_payload = detail_resp.json()
        self.assertEqual(detail_payload["postId"], first_confirmation["id"])
        self.assertIn("assets", detail_payload)
        self.assertIn("reviewRecords", detail_payload)
        self.assertIn("publishRecords", detail_payload)

        patch_resp = self.client.patch(
            f"/api/confirmations/{first_confirmation['id']}",
            json={"title": "确认对象已更新标题", "accountId": "account-yiyi"},
        )
        self.assertEqual(patch_resp.status_code, 200)
        patch_payload = patch_resp.json()
        self.assertEqual(patch_payload["title"], "确认对象已更新标题")
        self.assertEqual(patch_payload["accountId"], "account-yiyi")

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
                "failureType": "retryable",
            },
        )
        self.assertEqual(writeback_failed_resp.status_code, 200)
        failed_payload = writeback_failed_resp.json()
        self.assertEqual(failed_payload["status"], "publish_failed")
        self.assertEqual(failed_payload["publishStatus"], "failed")
        self.assertEqual(failed_payload["errorMessage"], "platform timeout")
        self.assertEqual(failed_payload["failureType"], "retryable")

        rate_limited_post_resp = self.client.post(
            "/api/posts",
            json={
                "topic": "限流失败回写",
                "title": "限流失败标题",
                "body": "限流失败正文",
                "tags": [],
                "assetIds": [],
            },
        )
        rate_limited_post_id = rate_limited_post_resp.json()["id"]
        self.client.post(
            f"/api/posts/{rate_limited_post_id}/submit-review",
            json={"comment": "提交", "operator": "qa"},
        )
        self.client.post(
            f"/api/posts/{rate_limited_post_id}/approve",
            json={"comment": "通过", "operator": "qa"},
        )
        self.client.post(
            f"/api/posts/{rate_limited_post_id}/publish",
            json={"comment": "进入发布", "operator": "qa"},
        )
        rate_limited_resp = self.client.post(
            f"/api/posts/{rate_limited_post_id}/publish-result",
            json={
                "publishStatus": "failed",
                "operator": "worker",
                "detail": "平台限流",
                "errorMessage": "too many requests",
                "failureType": "rate_limited",
            },
        )
        self.assertEqual(rate_limited_resp.status_code, 200)
        self.assertEqual(rate_limited_resp.json()["failureType"], "rate_limited")

    def test_openclaw_publish_adapter_state_flow(self) -> None:
        create_resp = self.client.post(
            "/api/posts",
            json={
                "topic": "OpenClaw 发布链路",
                "title": "OpenClaw 发布链路标题",
                "body": "OpenClaw 发布链路正文",
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

        publishing_resp = self.client.post(
            f"/api/posts/{post_id}/openclaw/execute-publish",
            json={"operator": "openclaw", "simulateResult": "none"},
        )
        self.assertEqual(publishing_resp.status_code, 200)
        self.assertEqual(publishing_resp.json()["status"], "publishing")
        self.assertEqual(publishing_resp.json()["publishStatus"], "queued")

        success_resp = self.client.post(
            f"/api/posts/{post_id}/openclaw/execute-publish",
            json={
                "operator": "openclaw",
                "simulateResult": "succeeded",
                "platformPostId": "xh_openclaw_1001",
                "detail": "mock success",
            },
        )
        self.assertEqual(success_resp.status_code, 200)
        self.assertEqual(success_resp.json()["status"], "published")
        self.assertEqual(success_resp.json()["publishStatus"], "succeeded")
        self.assertEqual(success_resp.json()["platformPostId"], "xh_openclaw_1001")

    def test_openclaw_publish_failed_classification_and_repeat_protection(self) -> None:
        create_resp = self.client.post(
            "/api/posts",
            json={
                "topic": "OpenClaw 失败分类",
                "title": "OpenClaw 失败分类标题",
                "body": "OpenClaw 失败分类正文",
                "tags": [],
                "assetIds": [],
            },
        )
        post_id = create_resp.json()["id"]
        self.client.post(f"/api/posts/{post_id}/submit-review", json={"comment": "提交", "operator": "qa"})
        self.client.post(f"/api/posts/{post_id}/approve", json={"comment": "通过", "operator": "qa"})

        self.client.post(
            f"/api/posts/{post_id}/openclaw/execute-publish",
            json={"operator": "openclaw", "simulateResult": "none"},
        )

        failed_resp = self.client.post(
            f"/api/posts/{post_id}/openclaw/execute-publish",
            json={
                "operator": "openclaw",
                "simulateResult": "failed",
                "detail": "mock failed",
                "errorMessage": "rate limit",
                "failureType": "rate_limited",
            },
        )
        self.assertEqual(failed_resp.status_code, 200)
        self.assertEqual(failed_resp.json()["status"], "publish_failed")
        self.assertEqual(failed_resp.json()["publishStatus"], "failed")
        self.assertEqual(failed_resp.json()["failureType"], "rate_limited")

        repeat_resp = self.client.post(
            f"/api/posts/{post_id}/openclaw/execute-publish",
            json={"operator": "openclaw", "simulateResult": "none"},
        )
        self.assertEqual(repeat_resp.status_code, 409)

        detail_resp = self.client.get(f"/api/posts/{post_id}")
        self.assertEqual(detail_resp.status_code, 200)
        detail_payload = detail_resp.json()
        self.assertEqual(detail_payload["status"], "publish_failed")
        self.assertGreaterEqual(len(detail_payload["publishRecords"]), 1)
        self.assertEqual(detail_payload["publishRecords"][-1]["failureType"], "rate_limited")

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

    def test_tasks_accounts_and_post_ownership(self) -> None:
        accounts_resp = self.client.get("/api/accounts")
        self.assertEqual(accounts_resp.status_code, 200)
        accounts = accounts_resp.json()
        self.assertGreaterEqual(len(accounts), 1)
        self.assertIn(accounts[0]["status"], {"online", "busy", "offline"})
        self.assertIn("todayTaskCount", accounts[0])
        self.assertIn("waitingCount", accounts[0])
        self.assertIn("publishedCount", accounts[0])
        self.assertIn("totalEngagement", accounts[0])
        self.assertIn("bestTopic", accounts[0])

        tasks_resp = self.client.get("/api/tasks")
        self.assertEqual(tasks_resp.status_code, 200)
        tasks = tasks_resp.json()
        self.assertGreaterEqual(len(tasks), 1)
        self.assertIn(
            tasks[0]["stage"],
            {
                "pending_generation",
                "copy_generated",
                "images_generated",
                "waiting_review",
                "waiting_publish",
                "publishing",
                "published",
                "failed",
            },
        )
        self.assertIn("stageLabel", tasks[0])
        self.assertIn("nextAction", tasks[0])
        self.assertIn("title", tasks[0])
        self.assertIn("accountName", tasks[0])
        self.assertIn("plannedAt", tasks[0])
        self.assertIn("requiresHumanReview", tasks[0])
        self.assertNotIn("scheduledAt", tasks[0])

        posts_resp = self.client.get("/api/posts")
        self.assertEqual(posts_resp.status_code, 200)
        posts = posts_resp.json()
        self.assertGreaterEqual(len(posts), 1)
        self.assertIn("accountId", posts[0])
        self.assertIn("messageTaskId", posts[0])

        linked_task = next((item for item in tasks if item.get("postId") and item.get("accountId")), None)
        self.assertIsNotNone(linked_task)
        linked_post = self.client.get(f"/api/posts/{linked_task['postId']}")
        self.assertEqual(linked_post.status_code, 200)
        self.assertEqual(linked_post.json()["accountId"], linked_task["accountId"])

    def test_qq_message_ingestion_creates_task_and_post_link_for_review(self) -> None:
        payload = {
            "source": "qq",
            "senderId": "qq_u_1001",
            "senderName": "测试用户",
            "conversationId": "qq_c_2001",
            "content": "明天发一篇春季护肤节奏建议",
            "sentAt": "2026-04-23T08:00:00+00:00",
            "eventId": "qq_event_abc_1",
            "signature": "dev-qq-shared-secret",
        }
        ingest_resp = self.client.post("/api/integrations/qq/messages", json=payload)
        self.assertEqual(ingest_resp.status_code, 201)
        ingest_payload = ingest_resp.json()
        self.assertTrue(ingest_payload["accepted"])
        self.assertFalse(ingest_payload["duplicated"])
        self.assertIn("postId", ingest_payload)

        tasks_resp = self.client.get("/api/tasks")
        self.assertEqual(tasks_resp.status_code, 200)
        tasks = tasks_resp.json()
        self.assertGreaterEqual(len(tasks), 1)
        self.assertEqual(tasks[0]["id"], ingest_payload["messageTaskId"])
        self.assertEqual(tasks[0]["postId"], ingest_payload["postId"])
        self.assertEqual(tasks[0]["sourceMessage"], payload["content"])
        self.assertEqual(tasks[0]["stage"], "pending_generation")
        self.assertIsNotNone(tasks[0]["accountId"])
        self.assertIsNotNone(tasks[0]["accountName"])

        post_detail_resp = self.client.get(f"/api/posts/{ingest_payload['postId']}")
        self.assertEqual(post_detail_resp.status_code, 200)
        post_detail = post_detail_resp.json()
        self.assertEqual(post_detail["messageTaskId"], ingest_payload["messageTaskId"])
        self.assertEqual(post_detail["accountId"], tasks[0]["accountId"])
        self.assertEqual(post_detail["status"], "draft")

        self.assertTrue(any(item.event_id == payload["eventId"] for item in repository.inbound_messages.values()))

    def test_qq_duplicate_event_does_not_create_multiple_posts_for_same_task(self) -> None:
        payload = {
            "source": "qq",
            "senderId": "qq_u_2002",
            "senderName": "重复用户",
            "conversationId": "qq_c_3002",
            "content": "周五发一条门店活动预热",
            "sentAt": "2026-04-23T10:00:00+00:00",
            "eventId": "qq_event_dup_1",
            "signature": "dev-qq-shared-secret",
        }
        first_resp = self.client.post("/api/integrations/qq/messages", json=payload)
        self.assertEqual(first_resp.status_code, 201)
        first_payload = first_resp.json()

        duplicate_resp = self.client.post("/api/integrations/qq/messages", json=payload)
        self.assertEqual(duplicate_resp.status_code, 201)
        duplicate_payload = duplicate_resp.json()
        self.assertTrue(duplicate_payload["duplicated"])
        self.assertEqual(duplicate_payload["messageTaskId"], first_payload["messageTaskId"])
        self.assertEqual(duplicate_payload["postId"], first_payload["postId"])

        tasks_resp = self.client.get("/api/tasks")
        self.assertEqual(tasks_resp.status_code, 200)
        matched_task = next(item for item in tasks_resp.json() if item["id"] == first_payload["messageTaskId"])
        self.assertIsNotNone(matched_task["accountId"])
        self.assertIsNotNone(matched_task["accountName"])

        post_detail_resp = self.client.get(f"/api/posts/{first_payload['postId']}")
        self.assertEqual(post_detail_resp.status_code, 200)
        self.assertEqual(post_detail_resp.json()["accountId"], matched_task["accountId"])

        matched_posts = [
            item
            for item in repository.posts.values()
            if item.message_task_id == first_payload["messageTaskId"]
        ]
        self.assertEqual(len(matched_posts), 1)

    def test_generation_flow_reaches_waiting_review_with_consistent_post_data(self) -> None:
        ingest_resp = self.client.post(
            "/api/integrations/qq/messages",
            json={
                "source": "qq",
                "senderId": "qq_u_gen_1",
                "senderName": "生成用户",
                "conversationId": "qq_c_gen_1",
                "content": "请生成一篇关于门店春季活动预热的内容",
                "sentAt": "2026-04-24T09:00:00+00:00",
                "eventId": "qq_event_gen_chain_1",
                "signature": "dev-qq-shared-secret",
            },
        )
        self.assertEqual(ingest_resp.status_code, 201)
        ingest_payload = ingest_resp.json()
        post_id = ingest_payload["postId"]
        task_id = ingest_payload["messageTaskId"]

        copy_resp = self.client.post(
            f"/api/posts/{post_id}/generate-copy",
            json={"operator": "qa", "payload": {"tone": "warm"}},
        )
        self.assertEqual(copy_resp.status_code, 200)
        task_after_copy = next(item for item in self.client.get("/api/tasks").json() if item["id"] == task_id)
        self.assertEqual(task_after_copy["stage"], "copy_generated")

        post_after_copy = self.client.get(f"/api/posts/{post_id}").json()
        self.assertIn("【自动生成文案】", post_after_copy["body"])

        images_resp = self.client.post(
            f"/api/posts/{post_id}/generate-images",
            json={"operator": "qa", "payload": {"style": "clean"}},
        )
        self.assertEqual(images_resp.status_code, 200)

        task_after_images = next(item for item in self.client.get("/api/tasks").json() if item["id"] == task_id)
        self.assertEqual(task_after_images["stage"], "waiting_review")
        self.assertTrue(task_after_images["hasCopy"])
        self.assertTrue(task_after_images["hasImages"])
        self.assertEqual(task_after_images["postId"], post_id)

        post_after_images = self.client.get(f"/api/posts/{post_id}").json()
        self.assertEqual(post_after_images["messageTaskId"], task_id)
        self.assertGreaterEqual(len(post_after_images["assetIds"]), 1)
        self.assertGreaterEqual(len(post_after_images["assets"]), 1)

    def test_generation_repeat_trigger_keeps_data_clean(self) -> None:
        ingest_resp = self.client.post(
            "/api/integrations/qq/messages",
            json={
                "source": "qq",
                "senderId": "qq_u_gen_2",
                "senderName": "重复生成用户",
                "conversationId": "qq_c_gen_2",
                "content": "请准备一次新品上架预告",
                "sentAt": "2026-04-24T10:00:00+00:00",
                "eventId": "qq_event_gen_chain_2",
                "signature": "dev-qq-shared-secret",
            },
        )
        self.assertEqual(ingest_resp.status_code, 201)
        payload = ingest_resp.json()
        post_id = payload["postId"]
        task_id = payload["messageTaskId"]

        self.client.post(
            f"/api/posts/{post_id}/generate-copy",
            json={"operator": "qa", "payload": {}},
        )
        self.client.post(
            f"/api/posts/{post_id}/generate-images",
            json={"operator": "qa", "payload": {}},
        )

        first_detail = self.client.get(f"/api/posts/{post_id}").json()
        first_asset_count = len(first_detail["assetIds"])
        first_body = first_detail["body"]

        self.client.post(
            f"/api/posts/{post_id}/generate-copy",
            json={"operator": "qa", "payload": {"tone": "formal"}},
        )
        self.client.post(
            f"/api/posts/{post_id}/generate-images",
            json={"operator": "qa", "payload": {"style": "minimal"}},
        )

        second_detail = self.client.get(f"/api/posts/{post_id}").json()
        self.assertEqual(second_detail["body"], first_body)
        self.assertEqual(len(second_detail["assetIds"]), first_asset_count)

        task_payload = next(item for item in self.client.get("/api/tasks").json() if item["id"] == task_id)
        self.assertEqual(task_payload["stage"], "waiting_review")
        self.assertEqual(task_payload["postId"], post_id)

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
