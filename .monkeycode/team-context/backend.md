# Backend Sync

## 第一阶段职责

- 完成 `backend/` 主业务 API 骨架
- 完成草稿、素材、审核、发布、指标快照的数据模型
- 完成草稿 CRUD、审核流转、生成任务入口、发布入口和指标采集入口
- 为 `worker/` 约定任务输入输出结构与状态流转字段

## 当前分配任务

### 本轮目标

- 先把后端主业务骨架和第一批可对接接口立起来
- 先保证数据模型、状态机和接口边界正确
- AI 调用、真实发布和真实指标采集先做任务入口与占位，不要求本轮接通外部平台

### 本轮必须交付

1. 完成后端目录与启动骨架
- 建立 `api/routes`、`models`、`schemas`、`services`、`repositories`、`db`
- 在 `main.py` 注册 `/health`、`/api/posts`、`/api/assets`、`/api/dashboard`

2. 完成核心模型与状态枚举
- `Post`
- `Asset`
- `ReviewRecord`
- `GenerationTask`
- `PublishLog`
- `MetricsSnapshot`

3. 完成第一批可联调接口
- `POST /api/posts`
- `GET /api/posts`
- `GET /api/posts/{post_id}`
- `PATCH /api/posts/{post_id}`
- `POST /api/assets/upload`
- `POST /api/posts/{post_id}/submit-review`
- `POST /api/posts/{post_id}/approve`
- `POST /api/posts/{post_id}/reject`
- `GET /api/dashboard/summary`

4. 完成任务入口占位
- `POST /api/posts/{post_id}/generate-copy`
- `POST /api/posts/{post_id}/generate-images`
- `POST /api/posts/{post_id}/publish`
- 本轮只要求创建任务记录、返回状态或日志记录，不要求接入真实外部平台

### 提交前自检

- 状态流转至少覆盖 `draft -> in_review -> approved -> publishing -> published/publish_failed`
- `published` 状态可记录 `platform_post_id`
- `MetricsSnapshot` 设计为追加写入
- 接口返回结构稳定，便于前端先接 mock 契约
- 开发完成后更新本文件底部同步区

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

## 本轮同步区

## 已完成
- 待填写

## 当前问题
- 待填写

## 需要协作
- 待填写

## 下一步
- 先完成基础目录、模型和草稿接口
