# Backend Sync

## 第一阶段职责

- 完成 `backend/` 主业务 API 骨架
- 完成草稿、素材、审核、发布、指标快照的数据模型
- 完成草稿 CRUD、审核流转、生成任务入口、发布入口和指标采集入口
- 为 `worker/` 约定任务输入输出结构与状态流转字段

## 第一阶段必须先做的任务

### 1. 目录与基础配置

- 在 `backend/app` 下新增：
  - `api/routes/`
  - `models/`
  - `schemas/`
  - `services/`
  - `repositories/`
  - `db/`
- 在 `backend/app/main.py` 注册基础路由：
  - `/health`
  - `/api/posts`
  - `/api/assets`
  - `/api/dashboard`

### 2. 先落库的数据模型

- `Post`
- `Asset`
- `ReviewRecord`
- `GenerationTask`
- `PublishLog`
- `MetricsSnapshot`

关键约束：

- `Post.status` 至少包含：
  - `draft`
  - `in_review`
  - `approved`
  - `publishing`
  - `published`
  - `publish_failed`
- `published` 帖子必须能记录 `platform_post_id`
- `MetricsSnapshot` 必须追加存储，不能覆盖旧数据

### 3. 第一批接口

- `POST /api/posts`
- `GET /api/posts`
- `GET /api/posts/{post_id}`
- `PATCH /api/posts/{post_id}`
- `POST /api/assets/upload`
- `POST /api/posts/{post_id}/submit-review`
- `POST /api/posts/{post_id}/approve`
- `POST /api/posts/{post_id}/reject`
- `POST /api/posts/{post_id}/generate-copy`
- `POST /api/posts/{post_id}/generate-images`
- `POST /api/posts/{post_id}/publish`
- `GET /api/dashboard/summary`

### 4. 与 worker 的接口边界

- `generate-copy` 和 `generate-images` 先只负责：
  - 创建任务记录
  - 返回 `task_id`
  - 标记状态为 `pending`
- `publish` 先只负责：
  - 校验帖子状态
  - 创建 `PublishLog`
  - 标记帖子进入 `publishing`
- 指标采集先只负责：
  - 预留任务入口
  - 预留快照写入方法

## 当前不需要你先做的内容

- 前端页面样式
- AI 提示词细节
- 多账号能力
- 自动定时发布

## 每次同步请按这个格式写

```markdown
## 已完成
- ...

## 当前问题
- ...

## 需要协作
- ...

## 下一步
- ...
```
