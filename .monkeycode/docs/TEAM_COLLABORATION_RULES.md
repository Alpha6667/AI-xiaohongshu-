# 小红书 AI 发帖平台三方协作规则说明

## 1. 项目目标

当前目标是完成小红书 AI 发帖平台的最终联调与验收，确保以下链路真实可用：

1. 后端接口服务可以调用 OpenClaw 执行发布和 metrics 抓取。
2. OpenClaw 可以使用服务器上的真实小红书登录态完成发布和数据抓取。
3. 后端可以保存发布结果、平台帖子 ID、metrics 快照和同步状态。
4. 前端可以展示帖子列表、帖子详情、metrics 历史和真实数据来源。
5. 最终结果可以通过 Git 交付，并在用户服务器上运行验收。

## 2. 三方角色边界

## 后端 GPT

后端 GPT 负责：

1. 维护后端 API。
2. 调用 OpenClaw webhook。
3. 保存 OpenClaw 返回的发布结果和 metrics 数据。
4. 维护 repository 持久化逻辑。
5. 提供前端需要的稳定 API response。
6. 编写和运行后端测试。
7. 提交后端相关代码到 Git。

后端 GPT 重点关注：

1. `POST /api/posts/{postId}/publish`
2. `POST /api/posts/{postId}/refresh-metrics`
3. `GET /api/posts`
4. `GET /api/posts/{postId}`
5. `latestMetrics`
6. `metricsHistory`
7. `metricsSource`
8. `lastSyncStatus`
9. `syncError`
10. `platformPostId`

后端 GPT 职责边界：

1. 真实登录小红书由 OpenClaw 负责。
2. 操作小红书创作者中心页面由 OpenClaw 负责。
3. OpenClaw Chrome profile 由 OpenClaw 维护。
4. 生产 `repository.json` 数据通过后端流程写入。

## 前端 GPT

前端 GPT 负责：

1. 展示后端 API 返回的数据。
2. 在 `/posts` 展示帖子列表。
3. 在 `/posts/[id]` 展示帖子详情。
4. 展示 metrics 数据来源。
5. 展示 metrics 历史记录。
6. 区分真实数据和 mock 数据。
7. 保持移动端和桌面端可用。
8. 提交前端相关代码到 Git。

前端 GPT 重点关注：

1. `frontend/src/app/posts/page.tsx`
2. `frontend/src/app/posts/[id]/page.tsx`
3. `frontend/src/lib/api/types.ts`
4. `frontend/src/lib/product.ts`
5. `frontend/src/styles/globals.css`

前端 GPT 必须显示：

1. 浏览量。
2. 点赞数。
3. 收藏数。
4. 评论数。
5. 关注转化数。
6. 数据来源。
7. 抓取时间。
8. 同步状态。
9. 同步错误信息。

前端 GPT 职责边界：

1. OpenClaw 调用由后端负责。
2. 小红书页面抓取由 OpenClaw 负责。
3. 真实 metrics 由 OpenClaw 返回、后端保存、前端展示。
4. 后端数据文件由后端流程维护。

## OpenClaw

OpenClaw 负责：

1. 使用服务器上的真实小红书登录态。
2. 执行真实发布。
3. 抓取真实 metrics。
4. 通过 webhook 返回结构化结果。
5. 维护 OpenClaw runtime 脚本。
6. 提交 OpenClaw 相关代码到 Git。

OpenClaw 重点关注：

1. `openclaw/server.js`
2. `openclaw/xhs_publish.js`
3. `openclaw/xhs_metrics.js`
4. `openclaw/SKILL.md`

OpenClaw 提供的接口：

1. `POST /api/openclaw/publish`
2. `POST /api/openclaw/metrics`
3. `GET /health`

OpenClaw 职责边界：

1. 业务数据保存由后端负责。
2. 前端页面展示由前端负责。
3. `platformPostId` 由真实发布结果产生并回传。
4. `metrics-snapshots` 由后端根据 OpenClaw 返回值写入。
5. 新建真实发布帖子需要用户明确授权。

## 3. 环境部署规则

当前生产项目在用户服务器上。

后端开发 GPT 可以在自己的开发环境改代码和跑测试，然后提交 Git。

最终真实联调必须在用户服务器上完成，因为：

1. 小红书登录态在用户服务器上。
2. OpenClaw Chrome profile 在用户服务器上。
3. 真实后端、真实前端、真实 OpenClaw 服务在用户服务器上。
4. 真实发布和真实 metrics 抓取依赖服务器环境。

如果后端、前端、OpenClaw 部署在同一台服务器，可以使用：

```text
http://127.0.0.1:<port>
```

如果后端、前端、OpenClaw 分布在不同服务器，必须使用双方可访问的 IP 或域名：

```text
http://<openclaw-server-ip>:18790/api/openclaw/metrics
```

跨服务器场景下，服务互调地址必须指向对方真实可访问的网络地址。

## 4. OpenClaw webhook 约定

OpenClaw 服务端口建议为：

```text
18790
```

健康检查接口：

```text
GET /health
```

期望返回：

```json
{
  "status": "healthy",
  "service": "openclaw-xiaohongshu-publisher",
  "version": "2.0.0",
  "realPublish": true
}
```

真实 metrics webhook：

```text
POST /api/openclaw/metrics
```

请求示例：

```json
{
  "postId": "post_3b524758e2",
  "platformPostId": "6a0213f4000000003502327e"
}
```

成功响应必须包含：

```json
{
  "views": 0,
  "likes": 0,
  "favorites": 0,
  "comments": 0,
  "followConversions": 0,
  "source": "xhs_creator_center",
  "capturedAt": "2026-05-11T19:17:38.587Z"
}
```

## 5. source 命名强约束

真实小红书创作者中心 metrics 的 source 必须是：

```text
xhs_creator_center
```

mock 数据的 source 必须是：

```text
mock
```

以下值属于历史错误值，仅用于排查旧数据：

```text
xhscreatorcenter
xhscreator_center
```

后端、前端、OpenClaw 三方必须统一使用：

```text
xhs_creator_center
```

## 6. 错误码强约束

OpenClaw metrics 失败时，错误码统一使用 snake_case。

允许值：

```text
login_required
post_not_found
page_structure_changed
metrics_unavailable
metrics_fetch_timeout
metrics_fetch_execution_error
```

后端需要保存错误码和错误信息。

前端需要展示同步失败状态和错误信息。

## 7. 后端 API 返回约定

`GET /api/posts/{postId}` 返回中必须包含：

```json
{
  "id": "post_3b524758e2",
  "platformPostId": "6a0213f4000000003502327e",
  "latestMetrics": {
    "views": 0,
    "likes": 0,
    "favorites": 0,
    "comments": 0,
    "followConversions": 0,
    "source": "xhs_creator_center",
    "capturedAt": "2026-05-11T19:17:38.587Z"
  },
  "metricsSource": "xhs_creator_center",
  "metricsHistory": [
    {
      "views": 0,
      "likes": 0,
      "favorites": 0,
      "comments": 0,
      "followConversions": 0,
      "source": "xhs_creator_center",
      "capturedAt": "2026-05-11T19:17:38.587Z"
    }
  ],
  "lastSyncStatus": "succeeded",
  "syncError": null
}
```

后端保存要求：

1. 保存 `latestMetrics.source`。
2. 保存 `metricsHistory[*].source`。
3. 保存 `capturedAt`。
4. 保存 `lastSyncStatus`。
5. 保存 `syncError`。
6. repository reload 后字段仍然完整。

## 8. 前端展示要求

前端 `/posts` 页面需要展示：

1. 帖子标题。
2. 发布状态。
3. 平台帖子 ID。
4. 浏览量。
5. 点赞数。
6. 收藏数。
7. 评论数。
8. 关注转化数。
9. 数据来源。
10. 最新同步状态。

前端 `/posts/[id]` 页面需要展示：

1. 帖子基础信息。
2. 发布状态。
3. 平台帖子 ID。
4. 最新 metrics。
5. metrics 历史表格。
6. 数据来源。
7. 抓取时间。
8. 同步错误信息。

真实数据来源展示建议：

```text
真实数据
```

对应 source：

```text
xhs_creator_center
```

mock 数据来源展示建议：

```text
测试数据
```

对应 source：

```text
mock
```

## 9. 真实发布安全规则

真实发布必须谨慎执行。

每天最多真实发布 2 条。

真实发布前必须确认：

1. 目标帖子尚未发布。
2. `status` 不是 `published`。
3. 没有已有 `platformPostId`。
4. 用户明确同意执行真实发布。
5. 当前小红书账号登录态有效。
6. OpenClaw Chrome 可以正常启动。

禁止行为：

1. 未授权新建帖子。
2. 未授权重复发布。
3. 手工把帖子改成 `published`。
4. 手工伪造 `platformPostId`。
5. 手工伪造真实 metrics。

## 10. 小红书登录态保护规则

OpenClaw 使用的真实登录态目录：

```text
/root/.openclaw/xhs-profile-persist
```

任何一方都不能：

1. 删除该目录。
2. 移动该目录。
3. 打包复制该目录。
4. 上传该目录。
5. 输出该目录中的 Cookie、token、session。
6. 用该目录做无关测试。

如果 OpenClaw 插件 runtime 缓存损坏，可以处理：

```text
/root/.openclaw/plugin-runtime-deps/
```

处理插件缓存时必须保护：

```text
/root/.openclaw/xhs-profile-persist
```

## 11. Git 协作规则

三方都通过同一个仓库协作：

```text
https://github.com/Alpha6667/AI-xiaohongshu-
```

交付分支：

```text
260509-chore-add-final-archive
```

协作流程：

1. 各方从最新分支拉代码。
2. 各方只改自己负责范围内的文件。
3. 改完后运行对应测试。
4. 提交清晰 commit。
5. 推送到交付分支或各自 feature 分支。
6. 把 commit hash、改动说明、测试结果发给技术负责人。
7. 技术负责人统一验收和决定是否合并。

提交说明需要包含：

1. 改了哪些文件。
2. 修复了什么问题。
3. 运行了哪些测试。
4. 是否影响运行配置。
5. 是否需要用户服务器重新部署。

## 12. 禁止提交的内容

任何一方都不能提交：

```text
.env
.env.local
.env.production
cookies
session
token
Chrome profile
Playwright user data
真实账号密码
截图中的敏感信息
```

任何一方都不能在聊天里输出：

```text
OPENAI_API_KEY
Claude API Key
OpenClaw token
小红书 Cookie
小红书 access-token
GitHub token
服务器密码
```

可以说明“已配置”或“已检测到”，但不能输出真实值。

## 13. 标准验收流程

最终验收以用户服务器为准。

## 第一步：检查 OpenClaw

在服务器上确认：

```bash
# 检查 OpenClaw health
python - <<'PY'
import requests
print(requests.get("http://127.0.0.1:18790/health", timeout=5).text)
PY
```

期望：

```text
status = healthy
realPublish = true
```

## 第二步：触发后端 refresh metrics

```bash
# 触发后端刷新真实 metrics
python - <<'PY'
import requests
post_id = "post_3b524758e2"
url = f"http://127.0.0.1:<backend-port>/api/posts/{post_id}/refresh-metrics"
print(requests.post(url, timeout=60).text)
PY
```

## 第三步：读取后端帖子详情

```bash
# 读取后端帖子详情
python - <<'PY'
import requests, json
post_id = "post_3b524758e2"
url = f"http://127.0.0.1:<backend-port>/api/posts/{post_id}"
data = requests.get(url, timeout=10).json()
print(json.dumps({
    "platformPostId": data.get("platformPostId"),
    "metricsSource": data.get("metricsSource"),
    "latestMetrics": data.get("latestMetrics"),
    "lastSyncStatus": data.get("lastSyncStatus"),
    "syncError": data.get("syncError"),
}, ensure_ascii=False, indent=2))
PY
```

必须满足：

```text
platformPostId = 6a0213f4000000003502327e
metricsSource = xhs_creator_center
latestMetrics.source = xhs_creator_center
lastSyncStatus = succeeded
syncError = null
```

## 第四步：打开前端页面

访问：

```text
http://43.138.143.39/posts
http://43.138.143.39/posts/post_3b524758e2
```

必须看到：

1. 帖子存在。
2. 平台帖子 ID 正确。
3. metrics 数值存在。
4. 数据来源显示真实数据。
5. 同步状态成功。
6. mock 数据按测试数据处理。

## 14. 当前主验证帖子

当前主验证帖子：

```text
postId = post_3b524758e2
platformPostId = 6a0213f4000000003502327e
title = 枯木逢春
content = 枯木会逢春，我们也是
```

优先使用这条帖子做 metrics 验证。

## 15. 各方交付格式

每一方完成任务后，按这个格式回复：

```text
角色：
后端 GPT / 前端 GPT / OpenClaw

本次改动：
1.
2.
3.

涉及文件：
1.
2.
3.

测试结果：
1.
2.
3.

commit：
<commit hash>

需要技术负责人确认：
1.
2.
```

## 16. 最终合并规则

用户测试满意前，交付分支继续作为验收分支。

满足以下条件后再合并：

1. OpenClaw 真实 metrics source 为 `xhs_creator_center`。
2. 后端保存和返回真实 metrics。
3. 前端显示真实数据。
4. 后端测试通过。
5. 前端 build 通过。
6. 用户服务器真实联调通过。
7. 用户确认验收满意。
