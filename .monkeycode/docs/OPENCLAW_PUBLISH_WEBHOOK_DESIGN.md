# OpenClaw 发布 Webhook 设计说明

## 目标

为当前系统补齐“backend 调用 OpenClaw 执行真实发布”的标准对接协议，解决现网只有内部模拟发布、没有真实发布执行 webhook 的问题。

本设计的目标不是直接定义小红书网页自动化细节，而是先把 `backend -> OpenClaw` 这一层调用契约定稳，让前后端可以围绕同一套发布执行协议协作。

## 当前问题

1. 现网 backend 已有：
   - `POST /api/posts/{post_id}/publish`
   - `POST /api/posts/{post_id}/openclaw/execute-publish`
   - `POST /api/posts/{post_id}/publish-result`
2. 现网缺少的是：OpenClaw 对外暴露的“真实发布执行 webhook”。
3. 因此当前真实小红书最小发布验收被卡在：没有可配置的 `OPENCLAW_PUBLISH_WEBHOOK_URL`。

## 设计原则

1. backend 与 OpenClaw 之间采用 HTTP webhook 通信。
2. backend 负责发起发布请求与承接结果，OpenClaw 负责执行真实平台动作。
3. OpenClaw webhook 默认支持异步执行，优先返回 `queued`。
4. OpenClaw 执行完成后，继续通过 backend 现有 `publish-result` 接口回写最终结果。
5. 在真实模式下，所有成功/失败结果必须可解释，不能停留在“只知道已提交”。

## 角色边界

### backend 负责

1. 校验帖子当前是否允许发布
2. 组织发给 OpenClaw 的发布请求
3. 记录初始发布日志
4. 承接 OpenClaw 同步返回
5. 承接 OpenClaw 后续异步回写结果

### OpenClaw 负责

1. 接收发布任务
2. 取用真实账号登录态或执行环境
3. 执行小红书真实发布动作
4. 产生执行日志
5. 将最终结果回写给 backend

## Webhook 设计

### 1. OpenClaw 对外执行入口

建议接口：

- `POST /api/openclaw/publish`

说明：

1. 该接口由 OpenClaw 暴露。
2. backend 通过 `OPENCLAW_PUBLISH_WEBHOOK_URL` 调用该接口。
3. 若未来需要版本化，可扩展为 `/api/openclaw/v1/publish`。

### 2. backend -> OpenClaw 请求体

建议最小请求体：

```json
{
  "requestId": "pubreq_123",
  "postId": "post_123",
  "accountId": "account_123",
  "accountName": "主品牌号",
  "operator": "openclaw",
  "title": "帖子标题",
  "body": "帖子正文",
  "tags": ["标签1", "标签2"],
  "assets": [
    {
      "id": "asset_123",
      "name": "封面图",
      "url": "https://...",
      "contentType": "image/jpeg"
    }
  ],
  "callback": {
    "publishResultUrl": "https://backend.example.com/api/posts/post_123/publish-result",
    "authToken": "optional-backend-callback-token"
  },
  "meta": {
    "source": "backend",
    "environment": "production"
  }
}
```

### 3. 字段要求

#### 必填字段

1. `requestId`
2. `postId`
3. `operator`
4. `title`
5. `body`
6. `assets`

#### 强烈建议字段

1. `accountId`
2. `accountName`
3. `tags`
4. `callback.publishResultUrl`

### 4. OpenClaw 同步响应体

OpenClaw webhook 同步响应支持三类结果：

#### 4.1 已接收排队

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

#### 4.2 同步成功

```json
{
  "publishStatus": "succeeded",
  "detail": "Published successfully on Xiaohongshu",
  "executionId": "exec_123",
  "executedAt": "2026-04-25T10:00:00Z",
  "publishedAt": "2026-04-25T10:00:08Z",
  "platformPostId": "xh_123456",
  "executionLogs": [
    "login session loaded",
    "content submitted",
    "publish confirmed"
  ]
}
```

#### 4.3 同步失败

```json
{
  "publishStatus": "failed",
  "detail": "Publish failed in OpenClaw execution",
  "executionId": "exec_123",
  "executedAt": "2026-04-25T10:00:00Z",
  "errorMessage": "login session expired",
  "failureType": "non_retryable",
  "executionLogs": [
    "login session missing",
    "publish aborted"
  ]
}
```

## 异步回写设计

### 1. 为什么需要异步回写

真实小红书发布可能需要：

1. 加载登录态
2. 上传图片
3. 填写正文与标签
4. 提交发布
5. 等待页面确认

这些步骤不适合同步阻塞 backend 请求，因此默认推荐：

1. OpenClaw 先同步返回 `queued`
2. 执行完成后再异步调用 backend 的 `publish-result`

### 2. OpenClaw -> backend 回写接口

沿用现有接口：

- `POST /api/posts/{post_id}/publish-result`

建议最小请求体：

```json
{
  "publishStatus": "succeeded",
  "operator": "openclaw",
  "detail": "Published successfully on Xiaohongshu",
  "platformPostId": "xh_123456",
  "publishedAt": "2026-04-25T10:00:08Z",
  "executionId": "exec_123",
  "executedAt": "2026-04-25T10:00:00Z",
  "executionLogs": [
    "login session loaded",
    "content submitted",
    "publish confirmed"
  ]
}
```

失败示例：

```json
{
  "publishStatus": "failed",
  "operator": "openclaw",
  "detail": "Publish failed in OpenClaw execution",
  "errorMessage": "rate limited by platform",
  "failureType": "rate_limited",
  "executionId": "exec_123",
  "executedAt": "2026-04-25T10:00:00Z",
  "executionLogs": [
    "publish button clicked",
    "platform rate limit detected"
  ]
}
```

## 状态映射

### backend 侧帖子状态

1. `approved`
2. `publishing`
3. `published`
4. `publish_failed`

### OpenClaw 响应状态

1. `queued`
2. `succeeded`
3. `failed`

### 映射规则

1. backend 调 OpenClaw 成功接收：
   - `approved -> publishing`
   - 发布日志 `publishStatus = queued`
2. OpenClaw 返回同步成功或异步成功：
   - `publishing -> published`
   - 发布日志 `publishStatus = succeeded`
3. OpenClaw 返回同步失败或异步失败：
   - `publishing -> publish_failed`
   - 发布日志 `publishStatus = failed`

## 失败分类

OpenClaw 返回失败时，统一收口到：

1. `retryable`
   - 临时网络错误
   - 执行环境短暂不可用
2. `non_retryable`
   - 登录态失效
   - 内容不符合发布要求
   - 未知但可解释的永久失败
3. `rate_limited`
   - 平台限流
   - 频率受限

若 OpenClaw 返回未知失败类型，backend 应收口为 `non_retryable`，保持可解释失败。

## 鉴权设计

### 1. backend 调 OpenClaw webhook

建议默认支持 Bearer Token：

```http
Authorization: Bearer <OPENCLAW_PUBLISH_AUTH_TOKEN>
```

若当前环境先走内网信任，也至少保留 token 能力，避免后续再改协议。

### 2. OpenClaw 回调 backend publish-result

建议 callback 也支持独立 token，例如：

```http
Authorization: Bearer <BACKEND_PUBLISH_RESULT_CALLBACK_TOKEN>
```

## 环境变量建议

backend 最少需要：

1. `OPENCLAW_PUBLISH_MODE=real`
2. `OPENCLAW_PUBLISH_WEBHOOK_URL=<OpenClaw 执行入口>`
3. `OPENCLAW_PUBLISH_AUTH_TOKEN=<可选，若 webhook 需要鉴权>`

OpenClaw 若要回调 backend，建议还需要：

1. `BACKEND_PUBLISH_RESULT_URL=<backend publish-result 基础地址或模板>`
2. `BACKEND_PUBLISH_RESULT_AUTH_TOKEN=<可选，若 backend 回调需要鉴权>`

## 前端承接要求

前端页面无需直接调用 OpenClaw webhook，但必须统一承接 backend 返回的真实结果：

1. `/review`
   - 展示是否已交给 OpenClaw
   - 展示真实发布反馈
2. `/dashboard`
   - 展示真实执行状态、执行时间、失败分类、下一步动作
3. `/posts/[id]`
   - 展示真实发布记录、平台回写、执行日志

## 最小落地顺序

1. 先由 OpenClaw 提供 `POST /api/openclaw/publish`
2. backend 配置 `OPENCLAW_PUBLISH_WEBHOOK_URL`
3. 先跑一次 `queued -> publish-result` 异步成功链路
4. 再跑一次真实失败链路，确认失败分类与页面承接

## 前后端协作结果定义

### 后端完成标志

1. backend 能调用 OpenClaw webhook
2. backend 能承接同步 `queued|succeeded|failed`
3. backend 能承接异步 `publish-result` 回写
4. 状态与日志字段稳定落库

### 前端完成标志

1. `/review`、`/dashboard`、`/posts/[id]` 对真实结果展示一致
2. 不再混用演示态和真实态
3. 成功、失败、执行中都能看出下一步是什么

## 当前结论

当前最缺的不是小红书账号信息，而是 OpenClaw 对外的真实发布执行 webhook。该 webhook 一旦按本设计补齐，真实小红书最小发布验收才具备继续推进的基础。
