# Backend Sync

## 第一阶段职责

- 完成 `backend/` 主业务 API 骨架
- 完成草稿、素材、审核、发布、指标快照的数据模型
- 完成草稿 CRUD、审核流转、生成任务入口、发布入口和指标采集入口
- 为 `worker/` 约定任务输入输出结构与状态流转字段

## 当前分配任务

### 第五轮主任务

- 第五轮以后端数据持久化和发布/指标链路补全为主
- 目标是把当前“可联调占位系统”推进到“数据可保留、状态可回写、指标可追踪”的下一阶段

### 本轮必须交付

1. 持久化替换
- 用真实持久化方案替换当前内存仓储
- 至少覆盖 `Post`、`Asset`、`ReviewRecord`、`PublishLog`、`MetricsSnapshot`

2. 发布结果回写
- 完善 `publish` 后续状态回写
- 支持 `published`、`publish_failed`
- 支持记录 `platform_post_id` 和失败错误信息

3. 指标快照写入
- 提供指标快照追加写入入口
- 保证历史快照不会被覆盖

4. 测试补强
- 补持久化最小测试
- 补发布结果回写测试
- 补指标快照追加写入测试

### 本轮不要先做

- 不要先接真实小红书平台
- 不要先扩多账号或定时发布
- 不要先做大规模前端契约改名

### 第四轮主任务

- 第四轮以后端补齐前端剩余阻塞接口为主
- 优先解决素材真实展示、生成入口、发布入口这三类联调缺口

### 本轮必须交付

1. 素材查询能力
- 提供前端可消费的素材查询方案
- 可以是新增素材列表接口，也可以是在帖子详情接口中补足素材展示字段

2. 生成与发布契约稳定
- 固定 `generate-copy`、`generate-images`、`publish` 的请求与响应结构
- 明确任务状态字段、错误返回和前端可展示信息

3. 测试补强
- 至少补一组生成或发布链路测试
- 若新增素材查询接口，补最小测试覆盖

### 本轮不要先做

- 不要先切真实数据库
- 不要先接真实小红书平台
- 不要先扩展趋势看板和多账号能力

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
- 第五轮第一步已完成：将仓储升级为文件持久化实现，`backend/app/repositories/memory.py` 现在会优先从 `backend/data/repository.json` 加载数据，不存在则自动 seed 并落盘。
- 持久化覆盖对象已纳入同一仓储：`Post`、`Asset`、`ReviewRecord`、`PublishLog`、`MetricsSnapshot`（并保留 `GenerationTask` 的持久化记录）。
- 已在写路径补持久化落盘：草稿创建/更新、审核记录写入、生成任务创建、发布任务入队、素材上传关联后都会触发 `repository.save()`。
- 已新增仓储级最小测试 `backend/tests/test_repository_persistence.py`，验证帖子写入后可从落盘文件重载。
- 已更新 API 最小测试重置逻辑：`backend/tests/test_api_minimal.py` 改为通过 `repository.reset_to_seed()` 重置并同步持久化状态。

## 当前问题
- 当前仅完成第五轮第一步；发布结果回写仍停留在 `publish` 入队后 `publishing` 状态。
- 尚未实现 `published` / `publish_failed` 的回写入口，也未写入 `platform_post_id` 与失败错误信息。
- 指标快照目前仍是种子与读取能力，尚未补“追加写入入口”和发布后自动追加策略。
- 测试环境依赖 `fastapi.testclient`，若环境未安装依赖将无法执行 API 级测试。

## 需要协作
- 前端可开始验证“重启后数据保留”场景，尤其是帖子与素材关联是否在重启后仍可读取。
- 第五轮第二步会补发布回写与指标追加，前端暂不需要改字段名，先保留现有展示契约。

## 下一步
- 进入第五轮第二步：新增发布结果回写入口，支持 `published`、`publish_failed`、`platform_post_id`、错误信息回写。
- 增加指标快照追加写入入口，保证历史快照追加而非覆盖，并补对应最小测试。
