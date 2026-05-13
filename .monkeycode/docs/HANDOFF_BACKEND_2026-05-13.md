# 2026-05-13 后端交接记录

## 当前结论

后端今天完成多账号 registry 支撑、真实账号 `account_aeziyo` 接入、OpenClaw `profilePath` 透传、orphan post/account 迁移保护，并完成生产 `refresh-metrics` 保存验收。

生产 metrics 验收已经通过：

```text
BACKEND_METRICS_ACCEPTANCE=PASS
```

## 关键生产验收对象

```text
postId = post_9100f36d13
platformPostId = 6a026a40000000003600289d
accountId = account_aeziyo
profilePath = /root/.openclaw/xhs-profile-persist-account_aeziyo
```

OpenClaw 生产 metrics 验证最终运行 commit：

```text
54b6ec8
```

OpenClaw 返回并由后端保存的最新指标：

```text
views = 10
comments = 0
likes = 2
favorites = 1
followConversions = 1
source = xhs_creator_center
matchedBy = first_card
lastSyncStatus = succeeded
syncError = null
```

## 后端保存验收

后端保存逻辑由 `backend/app/services/posts.py` 负责：

1. `refresh_metrics_snapshot` 调用 `publisher_adapter.fetch_metrics(post)`。
2. 成功后通过 `_append_metrics_snapshot` 追加一条 `MetricsSnapshot` 到 `repository.metrics_snapshots[post.id]`。
3. `latestMetrics` 由 `repository.metrics_snapshots[postId][-1]` 派生。
4. `metricsHistory` 由 `repository.metrics_snapshots[postId]` 完整序列化返回。
5. 成功刷新后设置 `post.last_sync_status = succeeded`。
6. 成功刷新后设置 `post.sync_error = None`。
7. `source` 保存并返回为 `xhs_creator_center`。

验收字段要求：

```json
{
  "latestMetrics": {
    "views": 10,
    "likes": 2,
    "favorites": 1,
    "comments": 0,
    "followConversions": 1,
    "source": "xhs_creator_center"
  },
  "metricsHistoryLatest": {
    "views": 10,
    "likes": 2,
    "favorites": 1,
    "comments": 0,
    "followConversions": 1,
    "source": "xhs_creator_center"
  },
  "lastSyncStatus": "succeeded",
  "syncError": null,
  "accountId": "account_aeziyo",
  "profilePath": "/root/.openclaw/xhs-profile-persist-account_aeziyo"
}
```

## 多账号后迁移保护

多账号 registry 改造后，后端必须保护历史生产帖子不会因为旧账号 ID 被删除而失去 refresh-metrics 能力。

本次修复位于：

```text
backend/app/repositories/memory.py
```

迁移规则：

```python
legacy_account_ids = {"account_seed_brand", "account_seed_store"}
real_account_id = "account_aeziyo"

for post in self.posts.values():
    if post.account_id is None or post.account_id in legacy_account_ids or post.account_id not in self.accounts:
        post.account_id = real_account_id
```

该规则覆盖三类历史数据：

1. `accountId = null` 的旧帖子。
2. `accountId = account_seed_brand` 或 `account_seed_store` 的旧 seed 帖子。
3. `accountId` 指向已不存在账号的 orphan post。

迁移只修改帖子账号归属，不清空 `metrics_snapshots`，不改写 `metricsHistory`，不重置 `lastSyncStatus`，不写入 `syncError`。

## account_aeziyo 校验

真实账号 registry 当前要求：

```json
{
  "id": "account_aeziyo",
  "name": "AEziyo",
  "xhsId": "364430981",
  "profilePath": "/root/.openclaw/xhs-profile-persist-account_aeziyo",
  "connectionStatus": "connected",
  "reauthRequired": false,
  "isActive": true
}
```

发布和 metrics webhook payload 都需要携带：

```json
{
  "account": {
    "id": "account_aeziyo",
    "name": "AEziyo",
    "handle": "@364430981",
    "xhsId": "364430981",
    "profilePath": "/root/.openclaw/xhs-profile-persist-account_aeziyo"
  }
}
```

## 本地开发容器验收边界

当前开发容器不包含生产 `repository.json`，因此本地无法直接验收生产 `post_9100f36d13` 的真实 metrics 保存状态。

本地检查结果：

```text
repository path = /tmp/ai-xhs-delivery/backend/data/repository.json
GET /api/posts/post_9100f36d13 = 404
```

原因：开发容器使用本地 seed repository，生产真实帖子、真实 OpenClaw 登录态和真实 metrics 快照都在用户服务器环境中。

因此生产验收必须在用户服务器执行，并以服务器 repository/API 返回为准。

## 生产验收命令

在用户服务器项目目录执行：

```bash
cd /srv/AI-xiaohongshu-/backend

python3 - <<'PY'
from fastapi.testclient import TestClient
from app.main import app
from app.repositories.memory import repository
import json

post_id = "post_9100f36d13"
expected = {
    "views": 10,
    "likes": 2,
    "favorites": 1,
    "comments": 0,
    "followConversions": 1,
    "source": "xhs_creator_center",
}

client = TestClient(app)
resp = client.get(f"/api/posts/{post_id}")
data = resp.json()
account = repository.accounts.get("account_aeziyo")
latest_history = (data.get("metricsHistory") or [None])[-1]

result = {
    "latestMetrics": data.get("latestMetrics"),
    "metricsHistoryLatest": latest_history,
    "lastSyncStatus": data.get("lastSyncStatus"),
    "syncError": data.get("syncError"),
    "accountId": data.get("accountId"),
    "profilePath": account.profile_path if account else None,
}

print(json.dumps(result, ensure_ascii=False, indent=2))

assert resp.status_code == 200
assert data["accountId"] == "account_aeziyo"
assert account is not None
assert account.profile_path == "/root/.openclaw/xhs-profile-persist-account_aeziyo"
assert data["lastSyncStatus"] == "succeeded"
assert data["syncError"] is None

for key, value in expected.items():
    assert data["latestMetrics"][key] == value, (key, data["latestMetrics"].get(key), value)
    assert latest_history[key] == value, (key, latest_history.get(key), value)

print("BACKEND_METRICS_ACCEPTANCE=PASS")
PY
```

生产验收结果：

```text
BACKEND_METRICS_ACCEPTANCE=PASS
```

## 今日后端相关提交

```text
d05d483 fix: seed real xhs account
3009a40 feat: support multi-account registry
4d4762d fix: migrate orphaned post accounts safely
```

相关协作提交：

```text
a8cdcb5 fix: multi-account profile isolation by dynamic XHS_PROFILE_DIR
1faa19b fix: surface active account state in frontend
64cb8d5 feat: add account management page
d5c9c7d feat: add topbar account switcher
```

## 本地测试命令和结果

本地后端回归命令：

```bash
python3 -m pytest tests/test_api_minimal.py tests/test_repository_persistence.py tests/test_publish_persistence.py
```

本地结果：

```text
57 passed in 1.79s
```

## 后续注意事项

1. 多账号 registry 后，生产历史帖子如果出现 `accountId` 指向不存在账号，加载 repository 时应自动迁移到 `account_aeziyo`。
2. metrics 刷新失败时只能更新 `lastSyncStatus` 和 `syncError`，不能删除或覆盖已有 `metricsHistory`。
3. `latestMetrics` 只从最新一条 `metricsHistory` 派生，发现“暂无数据”时优先检查 `metrics_snapshots[postId]` 是否存在。
4. 真实 source 必须保持 `xhs_creator_center`。
5. 生产验收以用户服务器 API 和 repository 为准，本地开发容器不能代表生产 repository 状态。
