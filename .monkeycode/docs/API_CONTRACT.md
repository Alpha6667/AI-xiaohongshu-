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

## 第二轮联调固定字段

### `GET /api/posts/{post_id}`

- 详情响应固定包含以下明细字段：
  - `assets`
  - `reviewRecords`
  - `publishRecords`
  - `metricsHistory`

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
