# QQ Ingest Handoff

## 目标

本说明用于让 OpenClaw 侧直接把 QQ 消息转发到业务后端，并完成第一阶段验收：QQ 发一句话后，后台 `/tasks` 能看到真实任务。

当前边界：

- 只验证 `QQ -> backend -> /api/tasks`
- 不触发小红书真实发布
- 不做多账号自动分配
- 不扩权限系统

## 后端入口

- 方法：`POST`
- 路径：`/api/integrations/qq/messages`
- 完整地址示例：`https://<backend-host>/api/integrations/qq/messages`

## 请求体

最小 JSON 字段如下：

```json
{
  "source": "qq",
  "senderId": "qq_u_1001",
  "senderName": "测试用户",
  "conversationId": "qq_group_2001",
  "content": "明天发一篇春季护肤节奏建议",
  "sentAt": "2026-04-23T08:00:00+00:00",
  "eventId": "qq_event_abc_1",
  "signature": "<shared-secret>"
}
```

说明：

- `source` 固定为 `qq`
- `eventId` 必须是同一条 QQ 事件的稳定唯一键，用于幂等去重
- `signature` 和 `sharedKey` 二选一，值需等于后端环境变量 `QQ_INGEST_SHARED_SECRET`
- `sentAt` 建议使用 ISO 8601 时间字符串

## 响应体

成功时返回 `201`，响应结构如下：

```json
{
  "accepted": true,
  "duplicated": false,
  "rawMessageId": "qqmsg_xxx",
  "messageTaskId": "taskmsg_xxx"
}
```

重复消息再次上报时：

- HTTP 状态仍为 `201`
- `accepted=true`
- `duplicated=true`
- `messageTaskId` 应返回首次创建的任务 ID

## 后端当前行为

- 使用 `QQ_INGEST_SHARED_SECRET` 做来源校验
- 按 `source + eventId` 做幂等去重
- 保存原始消息记录
- 创建阶段为 `pending_generation` 的真实消息任务
- 新任务会出现在 `GET /api/tasks` 列表前部

## OpenClaw 对接建议

1. 当 QQ bot 收到用户发来的自然语言需求后，整理出上面的最小 payload。
2. 生成稳定的 `eventId`，确保重试时仍是同一个值。
3. 使用服务到服务 HTTP 调用后端接口。
4. 收到 `accepted=true` 后记录一次转发成功日志。
5. 若收到超时或 5xx，可用同一个 `eventId` 安全重试。

## 验收清单

1. 在真实 QQ 对话里发送一条新需求。
2. 确认 OpenClaw 已向后端发出 `POST /api/integrations/qq/messages`。
3. 确认接口返回 `201` 且 `accepted=true`。
4. 打开后台 `/tasks` 页面，确认顶部出现对应真实任务。
5. 确认任务 `sourceMessage` 与 QQ 原文一致。
6. 确认任务阶段为 `pending_generation`。
7. 对同一事件重放一次，确认返回 `duplicated=true` 且未生成重复任务。

## 当前状态

- 2026-04-24 已在腾讯云服务器完成一轮真实验收。
- OpenClaw 已按约定把真实 QQ 消息转发到 `POST /api/integrations/qq/messages`。
- 后端已成功返回 `201 Created`，并在 `/api/tasks` 中生成真实任务。
- 已确认真实任务样例：`sourceMessage="QQ 发唯一测试消息"`，`stage="pending_generation"`。
- 已完成幂等去重复验：同一 `eventId=qq_event_dedupe_20260424_1` 连续上报两次时，第一次返回 `duplicated=false`，第二次返回 `duplicated=true`，且两次 `messageTaskId` 同为 `taskmsg_15128e20e1`。
- 已确认 `/api/tasks` 中仅保留一条 `sourceMessage="QQ 去重复验 20260424"` 的任务记录。
- 已完成前端 `/tasks` 页面源码级验收：页面 HTML 已命中真实任务 `QQ 发唯一测试消息`、`QQ 去重复验 20260424` 以及状态文案 `待生成`。
- 已确认页面源码未命中“当前仍在使用展示层回退任务数据”，说明当前前端展示的是后端真实任务数据而非展示层回退结果。
- 已确认线上 `POST /api/integrations/qq/messages` 直接返回非空 `postId`，说明真实 QQ 任务已经可以自动承接出 `/review` 所需的 `post`。
- 当前可以认定真实链路已升级为 `QQ -> OpenClaw -> backend -> post -> /review?postId=...`。

## 当前阻塞

- 本地自动化补跑暂被环境依赖阻塞：当前环境未安装 backend 依赖，执行 `python3 -m unittest tests.test_api_minimal` 会报 `ModuleNotFoundError: No module named 'fastapi'`。
- 这不影响已有代码和接口文档整理，但会影响在当前机器上做完整自动化复验。
