# API Contract

## 初始接口列表

- `GET /api/dashboard/summary`
- `GET /api/posts`
- `POST /api/posts`
- `GET /api/posts/{post_id}`
- `PATCH /api/posts/{post_id}`
- `POST /api/posts/{post_id}/generate-copy`
- `POST /api/posts/{post_id}/generate-images`
- `POST /api/assets/upload`
- `POST /api/posts/{post_id}/submit-review`
- `POST /api/posts/{post_id}/approve`
- `POST /api/posts/{post_id}/reject`
- `POST /api/posts/{post_id}/publish`

## 第二轮联调固定字段

### `GET /api/posts/{post_id}`

- 详情响应固定包含以下明细字段：
  - `reviewRecords`
  - `publishRecords`
  - `metricsHistory`

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
