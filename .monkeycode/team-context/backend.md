# Backend Sync

## 第一阶段职责

- 完成 `backend/` 主业务 API 骨架
- 完成草稿、素材、审核、发布、指标快照的数据模型
- 完成草稿 CRUD、审核流转、生成任务入口、发布入口和指标采集入口
- 为 `worker/` 约定任务输入输出结构与状态流转字段

## 当前分配任务

### 第三轮待命任务

- 第三轮以后端支持前端联调为主，不主动开启数据库重构
- 优先处理前端在真实接口接入中遇到的字段、状态、错误返回和素材关联问题
- 若本轮没有阻塞性问题，再补测试覆盖和小范围契约完善

### 本轮必须交付

1. 联调支持
- 响应前端关于 `posts`、`post detail`、`review`、`assets upload` 的阻塞问题
- 修复小范围边界问题时保持字段契约稳定

2. 契约维护
- 若接口字段或校验逻辑变更，必须同步更新 `API_CONTRACT.md`
- 明确记录哪些问题已修复，哪些仍待前端验证

3. 小范围增强
- 优先补一项联调相关测试：素材关联、生成任务入口或看板字段稳定性
- 不进入真实数据库和真实发布链路开发

### 本轮不要先做

- 不要主动切换数据库持久化
- 不要主动接真实小红书平台
- 不要主动扩展多账号和定时发布

### 今天的第二轮任务

- 本轮优先支持前端联调，不优先做数据库持久化
- 先把当前接口字段固定下来，并补足最小测试与 worker 占位
- 数据库替换和真实平台接入放到下一轮

### 本轮必须交付

1. 固定详情页字段契约
- `GET /api/posts/{post_id}` 继续返回：`reviewRecords`、`publishRecords`、`metricsHistory`
- 若字段有变更，必须先同步到 `API_CONTRACT.md` 和 `backend.md`

2. 固定看板接口边界
- `GET /api/dashboard/summary` 本轮只返回聚合数值
- 不额外扩展趋势字段，避免前端联调期间反复变更

3. 补最小接口测试
- 草稿 CRUD
- 审核流转
- 发布前状态校验

4. 补 worker 占位入口
- 在 `worker/app/tasks` 下建立文案生成、图片生成、发布、指标采集占位文件
- 统一任务状态字段：`pending`、`running`、`succeeded`、`failed`

### 本轮不要先做

- 不要优先切真实数据库
- 不要优先接真实小红书发布
- 不要优先扩展多账号能力

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
- 已补齐 `backend/app` 下的 `api/routes`、`models`、`schemas`、`services`、`repositories`、`db` 目录，并新增基础 `__init__.py`。
- 已在 `backend/app/main.py` 注册 `/health`、`/api/posts`、`/api/assets`、`/api/dashboard`，并补充基础 CORS 配置加载。
- 已创建第一批核心模型与状态枚举：`Post`、`Asset`、`ReviewRecord`、`GenerationTask`、`PublishLog`、`MetricsSnapshot`。
- 已用内存仓储先实现草稿 CRUD、素材上传占位、审核流转、生成任务入口、发布入口和看板汇总接口。
- 已为发布入口加入状态校验与去重保护，支持 `approved -> publishing` 的最小状态流转。
- 已预留指标快照追加存储结构，并在仓储中提供种子数据，便于前端和联调阶段直接获取稳定 JSON 结构。
- 已在 `.monkeycode/docs/API_CONTRACT.md` 文档化第二轮联调固定字段：详情接口固定返回 `reviewRecords`、`publishRecords`、`metricsHistory`，看板接口保持聚合字段稳定。
- 已补最小后端接口测试 `backend/tests/test_api_minimal.py`，覆盖草稿 CRUD、审核流转、发布前状态校验。
- 已在 `worker/app/tasks` 增加任务入口占位：`copy_generation.py`、`image_generation.py`、`publish.py`、`metrics_collection.py`，并统一状态字段 `pending/running/succeeded/failed`。

## 当前问题
- 当前后端使用内存仓储占位，尚未接入真实数据库和持久化层，服务重启后数据不会保留。
- `publish` 入口目前只创建 `PublishLog` 并把帖子置为 `publishing`，尚未实现成功/失败回写和真实平台交互。
- 指标采集目前只有汇总与快照结构占位，尚未开放独立采集接口或 worker 任务执行逻辑。
- 最小测试依赖 `fastapi.testclient` 运行环境，CI 需确保先安装 backend 依赖后再执行测试。

## 需要协作
- 需要前端确认详情页是否直接消费 `reviewRecords`、`publishRecords`、`metricsHistory` 这三个字段名称，避免后续联调时再次改契约。
- 需要协调方确认下一轮是优先接数据库持久化，还是先补测试与 worker 任务占位，以便安排实现顺序。
- 需要前端确认 `POST /api/assets/upload` 是否立即需要 `postId` 关联字段，若需要我下一轮补充到契约和服务层。

## 下一步
- 补充数据库持久化实现或仓储抽象，替换当前内存存储。
- 完善发布成功/失败回写、`platform_post_id` 更新以及指标快照追加写入入口。
- 扩展测试覆盖生成任务入口、看板稳定字段与素材关联接口。
