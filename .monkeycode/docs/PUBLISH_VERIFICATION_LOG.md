# 真实图文发布验收日志

## 发布信息

| 字段 | 值 |
|------|-----|
| **postId** | `post_9100f36d13` |
| **platformPostId** | `6a026a40000000003600289d` |
| **标题** | 「永失吾爱·破败之影」——佛耶戈的孤寂与宿命 |
| **正文** | 在破碎的废墟中，他举目仰望，手握永恒之剑，仿佛感受到那失去的爱依旧在身旁徘徊。风中灰烬、破碎的建筑，每一丝阴影都在低语——这是他的宿命，也是他的孤独。 |
| **tags** | 英雄联盟、佛耶戈 |
| **素材** | `asset_3876dcbec3` — 佛耶戈.png |
| **账号** | `brand_main` |
| **发布平台** | 小红书创作者中心 |
| **发布时间** | 2026-05-12 07:46 CST |

## finalBody（实际发往小红书）

```
在破碎的废墟中，他举目仰望，手握永恒之剑，仿佛感受到那失去的爱依旧在身旁徘徊。风中灰烬、破碎的建筑，每一丝阴影都在低语——这是他的宿命，也是他的孤独。

#英雄联盟 #佛耶戈
```

## 验收结果

| 验收项 | 结果 |
|--------|------|
| 真实发布成功 | ✅ |
| 只发布 1 条，没有重复 | ✅ |
| platformPostId 是真实小红书 noteId | ✅ `6a026a40000000003600289d` |
| 图片上传成功 | ✅ |
| 正文包含 `#英雄联盟 #佛耶戈` | ✅ |
| refresh-metrics 成功 | ✅ |
| metrics source = `xhs_creator_center` | ✅ |
| 前端图片展示已修复并可显示 | ✅ |
| 后端 asset content endpoint 已修复 | ✅ `/api/assets/{assetId}/content` |
| 发布状态持久化 | ✅ |
| lock 防重复机制 | ✅ |
| 32 项后端测试通过 | ✅ |
| 17 项持久化测试通过 | ✅ |

## 验收日期

2026-05-12 — 这证明了系统具备以下能力：

- 纯自动化发布完整链路（QQ→Backend→OpenClaw→XHS→回写→Metrics）
- 带图片发布
- 话题标签正确拼接
- metrics 指标准确性（通过 SVG path 分析修复字段映射）
- 前端素材图片通过后端 API 代理显示
- 发布状态持久化和防重复 lock

## 已修复的问题与改进

| 问题 | 修复措施 |
|------|----------|
| 初始 webhook 环境变量缺失导致 publishing 未真正调用 OpenClaw | 补充 `OPENCLAW_AI_URL` 、 `OPENCLAW_AI_TOKEN` 环境变量 |
| `xhs_publish.js` body/finalBody 变量问题导致发布脚本失败 | 修复变量传递和字符串拼接 |
| 曾出现伪造 `xh_realtime_` 前缀的 platformPostId | 清理；已固化规则：没有真实 platformPostId 禁止 published |
| metrics likes 和 favorites 对调 | 通过 SVG path 分析确认 DOM 图标顺序；修复字段映射 |
| 前端素材显示"素材加载失败" | 后端新增 `GET /api/assets/{assetId}/content` 代理本地文件 |
| 无防重复发布机制 | 实现 publish-state 持久化和 publish-lock 防重复 |

## 硬性规则（不可违背）

1. **published 只能由真实回调写入** — 禁止伪造 platformPostId
2. **同一个 postId 禁止二次触发发布** — lock 机制拦截
3. **发布前必须检查 webhook 和 /health** — 确保系统健康
4. **失败先查创作者中心** — 确认是否实际已经发布成功
5. **lock 超过 30 分钟自动清理** — 防止僵尸锁
6. **submitClicked=true 后禁止再次点击发布按钮**
7. **不保存 token、Cookie、Chrome profile 到状态文件**

## 2026-05-12 前端 UI 改版验收

前端改版提交：

```text
effb44be2c32ba4f4692db24d4eb6e9c8809d369
```

远程分支：

```text
260509-chore-add-final-archive
```

构建结果：

```text
pnpm --dir frontend build 通过
```

验收结果：

1. 首页通过：今日任务数、已生成、待确认和最近发布进展清晰展示。
2. 消息任务中心通过：任务以紧凑卡片展示，包含消息原文、系统任务类型、内容准备度、消息时间和操作链接。
3. 多账号运营通过：账号概览展示已连接、需重新登录、同步中、同步失败；账号卡片展示连接状态、同步状态、今日任务、待处理、已发布和最近互动。
4. 发布中心通过：`/posts` 表格可以区分已发布、发送中、发送失败，展示分类、标题、账号、状态、`platformPostId`、素材、5 项指标、数据来源、最近拉数和操作。
5. 帖子详情页通过：首屏展示标题、发布状态、主题、最终稿正文、标签、发布素材、发送结果、`platformPostId`、metrics 快照、数据来源和 OpenClaw 发送记录。
6. 真实发布链路通过：`post_9100f36d13` 保持 `status=published`，`platformPostId=6a026a40000000003600289d`。
7. `source` 展示通过：数据来源为 `xhs_creator_center`。
8. 图片和素材数据层通过：`asset.url=/api/assets/asset_3876dcbec3/content`，外网访问返回 `200 image/png`，大小约 1.8MB。

当前已知问题：

1. `refresh-metrics` 曾返回 `422`，同步错误为 `page_structure_changed`。
2. OpenClaw 后续确认根因是小红书创作者中心跳转到 captcha 或人工验证页，并已将错误归类修正为 `post_needs_manual_verification`。
3. 该问题与本轮前端 UI 改版无关，归属登录态或平台人工验证状态。
3. 帖子详情页仍可能因 SSR 缓存显示旧的“素材加载失败”文本，但 API 已返回正确素材 URL。
4. 构建过程提示未安装 ESLint，Next build 已完成编译、类型检查、页面生成和构建产物输出。

## 2026-05-12 OpenClaw metrics 人工验证识别修复

OpenClaw 修复提交：

```text
ed73c8cb23280b0d0515854d7dbabc95883c3216
```

远程分支：

```text
260509-chore-add-final-archive
```

修复结论：

1. `page_structure_changed` 本次是误判，真实原因是小红书创作者中心跳转到 captcha 或人工验证页。
2. OpenClaw 已移除此前临时尝试中的反检测参数、自定义 user agent、headful/xvfb 和自动重试逻辑。
3. OpenClaw 只保留 captcha 检测、安全停止和错误码修正。
4. 检测点覆盖预热页、note-manager 入口、卡片详情页、返回列表后。
5. 检测到 captcha 后立即停止 metrics 抓取，不继续发起更多请求。

captcha 场景返回结构：

```json
{
  "success": false,
  "error": "Xiaohongshu requires manual human verification. Open creator.xiaohongshu.com/new/home in a regular browser, complete the captcha, then retry.",
  "errorCode": "post_needs_manual_verification",
  "source": "xhs_creator_center",
  "capturedAt": "2026-05-12T01:XX:XX.000Z",
  "executionLogs": []
}
```

安全约束：

1. 禁止自动绕过 captcha、人机验证或平台风控。
2. 禁止使用反检测参数、自定义 UA 或自动化通过验证的流程。
3. 只允许检测并安全失败，提示用户在官方页面完成人工验证后再重试。

## 2026-05-12 后端与前端人工验证状态收口

后端提交：

```text
b5ec642 fix: accept manual verification metrics error
```

前端提交：

```text
d9677dcf0faed0f305318a6e6c313ea96ee5f14f
```

后端完成内容：

1. `post_needs_manual_verification` 已加入 OpenClaw metrics `errorCode` allowlist。
2. 该错误码不会被归一化成 `metrics_fetch_execution_error`。
3. `refresh-metrics` 失败时后端会保存并返回 `lastSyncStatus=failed`。
4. `refresh-metrics` 失败时后端会保存并返回 `syncError=post_needs_manual_verification`。

后端测试结果：

```text
python3 -m pytest tests/test_api_minimal.py
31 passed in 1.05s

python3 -m pytest tests/test_repository_persistence.py
4 passed in 0.48s
```

前端完成内容：

1. 同步状态展示支持 `post_needs_manual_verification`。
2. 数据来源失败说明支持 `post_needs_manual_verification`。
3. 帖子详情同步错误支持 `post_needs_manual_verification`。
4. 账号作品同步列表支持 `post_needs_manual_verification`。
5. 刷新按钮失败提示支持人工验证文案。

前端展示文案：

```text
需要在小红书官方页面完成人工验证后再刷新数据
```

刷新按钮失败提示：

```text
刷新数据失败：需要在小红书官方页面完成人工验证后再刷新数据。
```

前端测试结果：

```text
pnpm --dir frontend build
Compiled successfully
Generating static pages (12/12)
Finalizing page optimization
Collecting build traces
```

说明：构建过程中仍提示未安装 ESLint，这是当前工程现状；Next build 已完成编译、类型检查、页面生成和构建产物输出。

## 2026-05-12 refresh-metrics 人工验证后复验通过

复验前同步状态：

```text
HEAD = 122c146 docs: record manual verification UI support
```

确认历史中包含：

```text
122c146 docs: record manual verification UI support
d9677dc fix: show manual verification metrics state
b5ec642 fix: accept manual verification metrics error
a80b389 docs: record manual verification metrics state
ed73c8c fix: accurate captcha detection for metrics without bypass attempts
```

复验结果：

1. 人工验证期间，OpenClaw 正确返回 `post_needs_manual_verification`。
2. 人工验证期间，后端正确保存 `lastSyncStatus=failed` 和 `syncError=post_needs_manual_verification`。
3. 人工验证通过后，`refresh-metrics` 恢复成功。
4. 后端返回 `lastSyncStatus=succeeded`。
5. 后端返回 `syncError=null`。
6. metrics 数值正常更新，浏览量从 1 更新到 3，点赞和收藏等指标正常。
7. `source=xhs_creator_center`。
8. `metricsHistory` 从 3 条追加到 4 条。
9. OpenClaw 服务器 `git status` 干净。

本次复验证明：

1. OpenClaw captcha 检测和安全停止链路有效。
2. 后端错误码保存和成功恢复链路有效。
3. 前端人工验证提示链路已具备数据支持。
4. 用户完成官方人工验证后，真实 metrics 抓取可恢复。

## 2026-05-12 后端素材接口确认

后端素材接口修复提交：

```text
e565754 fix: serve local asset content via API
```

远程分支确认：

```text
260509-chore-add-final-archive 包含 e565754
REMOTE_CONTAINS_E565754=0
```

当前远端分支最新 HEAD：

```text
effb44b
```

确认结果：

1. 后端素材接口修复已经在远端历史中。
2. 本地冲突已清理，并快进到远端最新分支。
3. 实际本地冲突文件是前端文件：`frontend/src/app/posts/[id]/page.tsx`、`frontend/src/styles/globals.css`。
4. 后端文件当前没有冲突，也没有本地差异：`backend/app/services/assets.py`、`backend/app/services/posts.py`、`backend/tests/test_api_minimal.py`。
5. 前端 UI 文件没有被后端处理流程修改或提交。

后端能力确认：

1. `GET /api/assets/{assetId}/content` 可返回 repository 登记过的本地素材内容。
2. `GET /api/posts/{postId}` 返回 `assets[*].url=/api/assets/{assetId}/content`。
3. `GET /api/assets` 返回浏览器可访问 URL。
4. 前端 API 不暴露 `/root/.openclaw/...` 本地路径。
5. 远程 URL 不由后端代理，返回 `403`。
6. 本地文件缺失返回 `404`。
7. 发布 payload 给 OpenClaw 仍使用原始素材路径，真实上传链路保持不变。

测试结果：

```text
python3 -m pytest tests/test_api_minimal.py
31 passed in 1.07s

python3 -m pytest tests/test_repository_persistence.py
4 passed in 0.50s
```

提交安全确认：

1. 工作区干净。
2. 未提交 `.env`、token、Cookies、Chrome profile、截图、生产 `repository.json` 或 `.monkeycode/MEMORY.md`。

## 后续验收清单

1. 清理或刷新前端 SSR 缓存后，确认帖子详情页不再显示旧的“素材加载失败”文本。
2. 验证真实发布按钮不会对已发布帖子二次触发。
3. 验证无真实 `platformPostId` 时不会展示为已发布。
4. 视频发布进入第二阶段前，继续返回防御性错误码。

## 2026-05-13 Metrics 字段映射复核

复核对象：

```text
postId = post_9100f36d13
platformPostId = 6a026a40000000003600289d
```

用户人工确认的小红书 APP / 创作者中心基准：

```text
浏览 = nums[0] = 10
评论 = nums[1] = 0
点赞 = nums[2] = 2
收藏 = nums[3] = 1
分享 = nums[4] = 1
APP “赞和收藏 3” = 点赞 2 + 收藏 1
```

当前 `openclaw/xhs_metrics.js` 本地代码映射复核结果：

```javascript
views: nums[0]
comments: nums[1]
likes: nums[2]
favorites: nums[3]
followConversions: nums[4]
```

结论：

1. 当前本地代码已保留第 5 项分享/转发数据，写入 `followConversions`。
2. 当前本地代码中 precision match 和 first_card fallback 两处映射一致。
3. `a1e41fb fix: correct DOM field mapping for creator note-manager` 中提到的 `followConv: 0` 方案会丢弃分享数据，不能作为最终实现。
4. 若后续产品需要更直观字段名，建议后端和前端新增 `shares` 字段并从 `followConversions` 迁移展示；迁移前继续使用 `followConversions` 承载分享数。
5. OpenClaw 已提交最终修复：`2763de5`。
6. OpenClaw 已补充提交兼容后端 schema 的最终运行版本：`54b6ec8`，继续使用 `followConversions` 承载分享数。

下一步验收：

1. 由 OpenClaw 在生产环境用真实登录态执行一次 `post_9100f36d13` metrics refresh。
2. 回传结果需要包含 `views`、`comments`、`likes`、`favorites`、`followConversions`、`source`、`matchedBy`、`capturedAt`。
3. 确认前端最新快照显示点赞 2、收藏 1、评论 0、分享/转发 1 或等价字段。

真实后台截图复核：

1. 截图中第一张卡片底部顺序为：浏览 10、评论 0、点赞 2、收藏 1、分享 1。
2. 截图中第二张卡片底部顺序为：浏览 14、评论 3、点赞 3、收藏 2、分享 2。
3. 两张卡片的图标顺序一致，确认创作者中心列表页顺序为：浏览、评论、点赞、收藏、分享。

生产真实抓取验证：

```text
验证时间：2026-05-13 22:20 CST
postId：post_9100f36d13
platformPostId：6a026a40000000003600289d
标题：在破碎的废墟中...
DOM nums：[10, 0, 2, 1, 1]
views = 10
comments = 0
likes = 2
favorites = 1
followConversions = 1
source = xhs_creator_center
matchedBy = first_card
OpenClaw commit = 54b6ec8
```

验收结论：OpenClaw 真实 metrics 抓取、DOM 字段映射、分享数据保留和后端 schema 兼容均通过。下一步由后端确认本次 refresh 已保存为最新快照，再由前端确认帖子详情页首屏显示最新数据。

后端开发容器检查结果：

```text
code HEAD = 4d4762d
repository path = /tmp/ai-xhs-delivery/backend/data/repository.json
GET /api/posts/post_9100f36d13 = 404
response = {"detail":"Post not found"}
```

结论：当前开发容器使用本地 seed repository，无法读取生产服务器 OpenClaw 写入的真实 metrics 快照。后端保存验收必须在生产服务器 `/srv/AI-xiaohongshu-/backend` 执行。

生产后端验收命令：

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
print("status_code =", resp.status_code)

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

latest = data["latestMetrics"]
for key, value in expected.items():
    assert latest[key] == value, (key, latest.get(key), value)

assert latest_history is not None
for key, value in expected.items():
    assert latest_history[key] == value, (key, latest_history.get(key), value)

print("BACKEND_METRICS_ACCEPTANCE=PASS")
PY
```

生产预期验收标记：

```text
BACKEND_METRICS_ACCEPTANCE=PASS
```

生产后端保存验收结果：

```text
验收时间：2026-05-13 22:29 CST
BACKEND_METRICS_ACCEPTANCE=PASS
POST /api/posts/post_9100f36d13/refresh-metrics = 201
OpenClaw commit = 54b6ec8
Publisher mode during refresh = USE_REAL_PUBLISH=true
repository snapshots count = 161
```

后端返回的刷新结果：

```json
{
  "id": "metric_8043d5a198",
  "snapshotAt": "2026-05-13T14:29:33.040957+00:00",
  "views": 10,
  "likes": 2,
  "favorites": 1,
  "comments": 0,
  "followConversions": 1,
  "source": "xhs_creator_center"
}
```

repository 最新持久化 snapshot：

```json
{
  "id": "metric_03ae0702cc",
  "postId": "post_9100f36d13",
  "snapshotAt": "2026-05-13T14:29:54.914295+00:00",
  "views": 10,
  "likes": 2,
  "favorites": 1,
  "comments": 0,
  "followConversions": 1,
  "source": "xhs_creator_center"
}
```

验收结论：后端 `refresh-metrics`、OpenClaw 真实 playwright 抓取、内存模型更新和 `repository.json` 持久化均通过。

重要运行风险：验收完成后 Publisher 已恢复 mock 模式。前端页面有 60 秒自动刷新能力，在 mock 模式下继续刷新可能把 `latestMetrics` 覆盖为 mock 数据。前端验收期间需要临时保持 Publisher real 模式，或暂停该帖子自动刷新，直到字段展示验收完成。

前端验收冻结点：

```text
冻结时间：2026-05-13 22:36 CST
Publisher 状态：已停止
目的：阻止 mock metrics 覆盖刚验证通过的真实数据
验收接口：/api/posts/post_9100f36d13
```

冻结后后端 API 当前返回的最新真实 metrics：

```json
{
  "views": 10,
  "likes": 2,
  "favorites": 1,
  "comments": 0,
  "followConversions": 1,
  "source": "xhs_creator_center"
}
```

前端可在该冻结状态下验收 `/posts/post_9100f36d13`，验收完成后再恢复 Publisher。

前端当前观察：

```text
观察时间：2026-05-13 22:40 CST 左右
页面数据：正确
页面最新数据时间：2026-05-13 22:30:52
现象：时间停止更新
原因：Publisher 已停止，自动刷新无法继续拉取新 metrics
```

运行恢复要求：

```text
恢复 Publisher 时必须使用 USE_REAL_PUBLISH=true。
恢复后检查 /health，确认 realPublish=true。
不能以 mock 模式恢复，否则前端 60 秒自动刷新会再次写入 mock metrics。
数据映射无需再改，当前正确值已经通过生产验证。
```
