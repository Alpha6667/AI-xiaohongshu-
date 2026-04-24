# OpenClaw 后端任务单

## 目标

为 OpenClaw 补齐最小可联调的真实发布执行能力，使 backend 可以通过标准 webhook 把一条已确认内容交给 OpenClaw 执行，并拿到同步结果或异步回写结果。

## 当前结论

1. 现网 OpenClaw 当前没有 `POST /api/openclaw/publish`。
2. 当前没有真实小红书发布适配器。
3. 当前没有真实账号登录态管理。
4. 当前没有回调 backend `publish-result` 的逻辑。
5. 因此真实小红书最小发布验收暂时无法继续。

## 本轮边界

1. 本轮只做 OpenClaw 侧最小发布执行能力。
2. 本轮不做多账号调度。
3. 本轮不做批量发布。
4. 本轮不做复杂重试系统。
5. 本轮先优先支持单账号、单条内容、单次真实发布。

## 必须交付

### 1. 提供发布执行接口

实现：

- `POST /api/openclaw/publish`

要求：

1. 接口能被 backend 通过 HTTP 调用。
2. `Content-Type` 使用 `application/json`。
3. 能解析 backend 传入的最小请求体。

### 2. 支持解析 backend 请求体

最小需支持以下字段：

1. `requestId`
2. `postId`
3. `operator`
4. `account`
5. `content.title`
6. `content.body`
7. `content.tags`
8. `content.assets`
9. `callback.publishResultUrl`
10. `callback.authToken`（如有）

### 3. 支持最小同步响应

同步响应至少支持以下三类状态：

1. `queued`
2. `succeeded`
3. `failed`

同步响应体至少支持：

1. `publishStatus`
2. `detail`
3. `executionId`
4. `executedAt`
5. 成功时可带：
   - `platformPostId`
   - `publishedAt`
6. 失败时可带：
   - `errorMessage`
   - `failureType`
   - `executionLogs`

### 4. 支持异步结果回写

OpenClaw 执行完成后，需支持调用 backend：

- `POST /api/posts/{post_id}/publish-result`

要求：

1. 成功时回写最终发布结果。
2. 失败时回写最终失败结果。
3. 回写字段与设计文档保持一致。

### 5. 支持最小失败分类

失败分类统一支持：

1. `retryable`
2. `non_retryable`
3. `rate_limited`

若 OpenClaw 内部出现其他错误类型，也应映射到以上三类之一。

### 6. 支持最小执行日志

回写结果中至少支持 `executionLogs`，用来说明：

1. 是否接收到任务
2. 是否进入执行
3. 是登录失败、上传失败、提交失败，还是成功发布

### 7. 补齐真实执行环境

至少补齐：

1. 真实小红书账号登录态管理
2. 浏览器执行环境（Chrome / Chromium 或等价环境）
3. 最小人工验证链路

### 8. 鉴权能力

至少确认并实现其一：

1. OpenClaw webhook 支持 Bearer Token
2. 或明确当前先走内网信任

如果支持 token，请明确：

1. header 名称
2. 配置方式
3. 环境变量名称

## 建议返回格式

同步响应建议：

```json
{
  "publishStatus": "queued",
  "detail": "Submitted to OpenClaw real queue",
  "executionId": "exec_123",
  "executedAt": "2026-04-25T10:00:00Z",
  "executionLogs": [
    "accepted by openclaw queue"
  ]
}
```

## 对齐文档

实现时请以这份设计文档为准：

- `.monkeycode/docs/OPENCLAW_PUBLISH_WEBHOOK_DESIGN.md`

## 验收标准

1. backend 可以配置 `OPENCLAW_PUBLISH_WEBHOOK_URL` 指向 OpenClaw。
2. backend 调用 webhook 后，至少能拿到一次同步 `queued|succeeded|failed` 结果。
3. OpenClaw 可以在执行结束后回调 backend `publish-result`。
4. 至少完成一次真实成功或一次真实可解释失败。

## 完成后回传

1. 接口完整 URL
2. 是否需要鉴权
3. 鉴权方式和 token 配置方式
4. 是否支持异步回写
5. 是否已具备真实账号登录态和执行环境
6. 最小联调结果
