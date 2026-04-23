# API Contract

## 初始接口列表

- `GET /api/dashboard/summary`
- `GET /api/posts`
- `POST /api/posts`
- `GET /api/posts/{post_id}`
- `PATCH /api/posts/{post_id}`
- `POST /api/posts/{post_id}/generate-copy`
- `POST /api/posts/{post_id}/generate-images`
- `GET /api/assets`
- `POST /api/assets/upload`
- `POST /api/posts/{post_id}/submit-review`
- `POST /api/posts/{post_id}/approve`
- `POST /api/posts/{post_id}/reject`
- `POST /api/posts/{post_id}/publish`
- `POST /api/posts/{post_id}/publish-result`
- `POST /api/posts/{post_id}/metrics-snapshots`
- `GET /api/tasks`
- `GET /api/accounts`
- `POST /api/integrations/qq/messages`

## 第二轮联调固定字段

### `GET /api/posts/{post_id}`

- 详情响应固定包含以下明细字段：
  - `assets`
  - `reviewRecords`
  - `publishRecords`
  - `metricsHistory`
- 详情与列表补充账号归属字段（兼容新增，不影响旧字段）：
  - `accountId`（nullable）
  - `messageTaskId`（nullable）

### `GET /api/assets`

- 支持查询参数：
  - `postId`：按帖子过滤素材
  - `ids`：按素材 ID 列表过滤（逗号分隔）

### `POST /api/posts/{post_id}/generate-copy` and `POST /api/posts/{post_id}/generate-images`

- 请求体：
  - `operator`（string）
  - `payload`（object）
- 响应体固定字段：
  - `taskId`
  - `postId`
  - `status`（`pending|running|succeeded|failed`）
  - `taskType`（`generate_copy|generate_images`）
  - `createdAt`
  - `message`

### `POST /api/posts/{post_id}/publish`

- 请求体：
  - `operator`（string）
  - `comment`（string）
- 响应体固定字段：
  - `publishLogId`
  - `postId`
  - `status`（帖子状态，成功入队后为 `publishing`）
  - `publishStatus`（发布日志状态，入队为 `queued`）
  - `detail`
  - `createdAt`
  - `message`
  - `platformPostId`（nullable）
  - `errorMessage`（nullable）
  - `failureType`（nullable，`retryable|non_retryable|rate_limited`）

### `POST /api/posts/{post_id}/publish-result`

- 用于 worker 或后端任务回写发布结果。
- 第六轮起，worker 发布任务完成后应自动触发该接口，不再只依赖手动调用。
- 请求体：
  - `publishStatus`（`succeeded|failed`）
  - `operator`（string，可选）
  - `detail`（string，可选）
  - `platformPostId`（string，可选，发布成功时写回）
  - `errorMessage`（string，可选，发布失败时写回）
  - `failureType`（`retryable|non_retryable|rate_limited`，发布失败时建议携带）
- 响应体：沿用 `publish` 响应结构，返回回写后的状态与信息。

### `POST /api/posts/{post_id}/metrics-snapshots`

- 用于追加写入帖子指标快照，不覆盖历史。
- 第六轮起，worker 指标任务完成后应自动触发该接口。
- 请求体：
  - `views`
  - `likes`
  - `favorites`
  - `comments`
  - `followConversions`
  - `snapshotAt`（可选，不传则后端自动生成）
- 响应体：返回新写入的快照记录。

### `GET /api/tasks`

- 用于消息任务中心页面。
- 返回字段：
  - `id`
  - `sourceMessage`
  - `title`
  - `topic`
  - `stage`（`pending_generation|waiting_review|waiting_publish|publishing|published|failed`）
  - `stageLabel`
  - `nextAction`
  - `postId`（nullable）
  - `accountId`（nullable）
  - `accountName`（nullable）
  - `requestedAt`
  - `plannedAt`（统一计划时间字段，始终返回）
  - `hasCopy`
  - `hasImages`
  - `requiresHumanReview`

### `GET /api/accounts`

- 用于多账号运营页。
- 返回字段：
  - `id`
  - `name`
  - `handle`
  - `status`（`online|busy|offline`）
  - `summary`
  - `lastActiveAt`（nullable）
  - `todayTaskCount`
  - `waitingCount`
  - `publishedCount`
  - `totalEngagement`
  - `bestTopic`（nullable）

### `POST /api/integrations/qq/messages`

- 用于接收 OpenClaw 转发的 QQ 原始消息，并落库成真实消息任务。
- 请求体最小字段：
  - `source`（固定为 `qq`）
  - `senderId`
  - `senderName`
  - `conversationId`
  - `content`
  - `sentAt`
  - `eventId`（幂等键）
  - `signature` 或 `sharedKey`（二选一，用于来源校验）
- 后端处理：
  - 校验共享密钥（环境变量 `QQ_INGEST_SHARED_SECRET`）
  - 按 `source + eventId` 幂等去重
  - 保存原始消息记录
  - 创建 `pending_generation` 阶段的 `message task`
- 响应字段：
  - `accepted`
  - `duplicated`
  - `rawMessageId`
  - `messageTaskId`

### `GET /api/dashboard/summary`

- 本轮保持聚合字段稳定，不扩展趋势字段：
  - `totalPosts`
  - `totalViews`
  - `totalLikes`
  - `totalFavorites`
  - `totalComments`
  - `followConversions`
  - `pendingReviewCount`
  - `publishedCount`
