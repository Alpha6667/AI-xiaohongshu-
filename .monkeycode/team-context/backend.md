# Backend Sync

## 当前优先级说明

- 下一阶段执行顺序以 `.monkeycode/docs/NEXT_PHASE_EXECUTION_PLAN.md` 为准。
- 后端当前最优先的两个动作是：先补真实 QQ 帖子的账号归属，再打通 `pending_generation` 之后的真实生成状态推进。

## 第十轮真实入站任务账号归属收口

- 本轮聚焦真实 QQ/OpenClaw 入站任务的账号归属，目标是消除主路径 `accountId` 为空数据。
- 真实 `message task` 创建时稳定写入 `accountId`，并通过 `/api/tasks` 稳定返回 `accountName`。
- 真实任务承接 `post` 时，`post.accountId` 与 `task.accountId` 保持一致。
- 对同一 `eventId` 的重放请求保持幂等，不新增任务和帖子，也不写乱已有关联账号。
- 保持现有边界：不扩小红书真实发布、多账号自动分配、权限系统。

## 下一阶段任务：Message Task 承接到 Review

- 当前 `QQ -> OpenClaw -> backend -> /tasks` 已真实打通，前端 `/tasks` 也已确认展示的是后端真实任务数据。
- 2026-04-24 已确认服务器实际部署在提交 `9f457f4`，`POST /api/integrations/qq/messages` 已可直接返回非空 `postId`。
- 当前已完成自动承接：真实 QQ 入站后可自动创建或关联 `post`，不再需要手动补 post 才能进入 `/review`。
- 当前真实链路已升级为 `QQ -> OpenClaw -> backend -> post -> /review?postId=...`。

### 本轮目标

1. 补齐 `message task -> post` 承接链路
- 当真实 QQ 入站任务进入 `pending_generation` 后，后端需要能为其生成或关联一个对应的 `post`。
- 该 `post` 应成为前端 `/review` 页可消费的确认对象，而不是只停留在任务中心。

2. 补齐双向关联字段
- 为真实 `message task` 回写 `postId`。
- 为对应 `post` 回写 `messageTaskId`。
- 保持后续 `/review?postId=...`、帖子详情、任务列表都能稳定追溯同一条来源消息。

3. 保持现有链路稳定
- 不破坏当前已打通的 QQ 入站接口、幂等去重和 `/api/tasks` 展示。
- 不扩小红书真实发布、多账号自动分配、权限系统。

### 本轮必须交付

1. 真实任务承接策略
- 为 `pending_generation` 的真实 QQ `message task` 增加生成或绑定 `post` 的最小后端逻辑。
- 保证同一条真实任务不会重复生成多个 `post`。

2. 关联字段稳定返回
- `GET /api/tasks` 中的真实任务应稳定返回可用的 `postId`。
- `GET /api/posts` 与 `GET /api/posts/{id}` 中应稳定返回 `messageTaskId`。

3. Review 可承接
- 前端后续应可通过 `/review?postId=<postId>` 打开该真实任务对应的内容确认页。
- `/review` 页面中的“消息来源”区域应能展示该真实任务原始 `sourceMessage`。

4. 最小测试补充
- 至少补一组“真实 QQ 入站任务生成/关联 post”的测试。
- 至少补一组“同一任务不重复生成多个 post”的测试。

### 本轮边界

- 不要求本轮完成真实 AI 文案生成和真实图片生成。
- 不要求本轮补完整的内容生成 worker。
- 本轮重点仅是把“真实任务中心”正确承接到“内容确认台”入口。

### 完成标准

- 真实 QQ 消息进入后端后，不仅能在 `/tasks` 看到任务，也能找到与之关联的 `post`。
- 前端 `/review?postId=...` 能打开该任务对应的确认页。
- 页面中的消息来源、任务阶段和确认对象彼此一致，不再停留在仅靠种子 `post` 验证的状态。

### 当前状态

- 该任务已由后端完成并部署验证，无需再作为待实现缺口继续跟进。
- 后续重点应从“补 `task -> post`”切换为“验收 `/review` 页面动作链路”和“推进内容生成承接”。

## 第八轮 QQ 联调收尾说明

- QQ 入站最小实现已在提交 `13a67be` 落地，当前需要的不是继续扩功能，而是完成 OpenClaw 到后端的真实联调验收。
- OpenClaw 侧请按 `.monkeycode/docs/QQ_INGEST_HANDOFF.md` 中的 payload 和验收步骤对接。
- 当前后端边界仍保持为：只接收入站消息、做去重、落原始消息、建真实任务，不触发小红书发布，也不自动分配账号。
- 当前本地补跑 `python3 -m unittest tests.test_api_minimal` 被环境阻塞，缺少 `fastapi` 依赖；继续验证前需先完成 backend 依赖安装。
- 2026-04-24 已完成腾讯云真实验收：OpenClaw 转发的 QQ 消息已成功创建真实任务，样例任务 `sourceMessage="QQ 发唯一测试消息"`，`stage="pending_generation"`。
- 2026-04-24 已完成去重复验：同一 `eventId` 重放两次仅保留一条任务，第一次 `duplicated=false`，第二次 `duplicated=true`，对应 `messageTaskId=taskmsg_15128e20e1`。
- 2026-04-24 已确认 `POST /api/integrations/qq/messages` 在线上直接返回非空 `postId`，样例 `postId=post_e430203528`，说明真实 `task -> post` 自动承接已打通。
- 2026-04-24 已完成 `/review` 页面动作验收：任务 A `post_f01d2157a6` 已完成 `submit -> approve` 并进入 `approved`，任务 B `post_d61a46fec4` 已完成 `submit -> reject` 并回到 `draft`。
- 两条真实任务的 `reviewRecords` 均正确追加了两条记录，说明 `/review` 动作已能稳定驱动后端状态变化。
- 2026-04-24 已完成 `/dashboard` 页面验收：真实页面已命中 `发布中心`、`OpenClaw`、`待发送`、`发送中`、`已发布`、`发送失败` 等状态关键词。
- 任务 A `post_f01d2157a6` 当前仍为 `approved`，任务 B `post_d61a46fec4` 当前为 `draft`，两条记录都带 `messageTaskId`，与发布中心当前展示阶段一致。
- 2026-04-24 已完成 `/posts` 与 `/posts/[id]` 验收：两页都在消费真实 `GET /api/posts` / `GET /api/posts/{id}` 返回，不再是纯展示页。
- 当前线上 `/posts` 列表展示的唯一已发布样本是 `post_seed_published`，其标题、平台 ID、指标历史和详情页内容都与后端真实接口一致。
- 当前后端仍有一个会影响页面真实性的字段缺口：真实 QQ 验收帖子如 `post_f01d2157a6`、`post_d61a46fec4` 的 `post.accountId` 和对应 `task.accountId` 仍为 `null`，导致前端详情页只能回退到种子账号归属展示。
- 现阶段后端不需要再为 QQ 入站扩新功能，优先级已转为去重复验、前端页面验收和下一阶段生成链路承接。

## 第九轮 message task 承接到 review 同步

- 本轮目标是打通 `message task -> post -> /review` 最小承接链路，不扩小红书发布、多账号自动分配和权限系统。
- QQ 入站创建真实任务时，后端会同步创建或关联一个 `post` 作为确认对象。
- 后端保证双向关联：`messageTask.postId` 与 `post.messageTaskId` 一致。
- 对同一入站事件（同 `source + eventId`）保持幂等，不重复生成 `post`。
- 现有 `POST /api/integrations/qq/messages`、去重逻辑和 `/api/tasks` 排序行为保持兼容。

## 第八轮 QQ 消息入任务链路同步

- 本轮仅聚焦“QQ 消息 -> 后端真实 message task”，不涉及小红书发布、多账号调度、权限系统。
- 新增 `POST /api/integrations/qq/messages`，用于接收 OpenClaw 转发的 QQ 消息。
- 接口已覆盖最小入参校验（来源字段、基础消息字段、`signature/sharedKey` 二选一）。
- 服务端已实现来源校验、`eventId` 幂等去重、原始消息落库、真实 `message task` 创建。
- `/api/tasks` 继续按 `updatedAt` 倒序返回，真实消息任务会优先出现在列表前部。
- 当前仍保持边界：不做复杂解析、不自动分配账号、不改现有发布链路。

## 第七轮消息任务与多账号最小支撑同步

- 前端已完成“OpenClaw 对话入口 + 后台确认 + 多账号运营”的页面重构，后端下一轮要补最小支撑能力。
- 本轮目标不是扩真实小红书平台接入，也不是做复杂调度系统，而是先让前端新的产品结构有稳定的数据承接点。
- 本轮必须优先保证新增能力和现有 `posts`、`dashboard` 契约兼容，不破坏第六轮已稳定的发布和回写链路。

### 本轮目标

1. 补齐消息任务最小模型
- 后端需要能表达“用户发给 OpenClaw 的原始消息”和“这条消息转成的后台任务”。
- 任务至少要能表达当前阶段、关联帖子、归属账号和下一步动作。

2. 补齐多账号归属最小模型
- 后端需要能表达账号列表、账号状态、帖子归属、任务归属。
- 不要求本轮做账号鉴权、权限系统或真实平台登录态接入。

3. 保持旧链路稳定
- 现有 `posts`、`publish-result`、`metrics-snapshots`、`dashboard` 不能因为本轮扩展而被破坏。
- 现有前端已接字段不得随意改名或删除。

### 本轮必须交付

1. 新增消息任务数据结构
- 增加消息任务实体或等价的数据组织层，至少包含：
  - `id`
  - `sourceMessage`
  - `topic`
  - `stage`
  - `postId`
  - `accountId`
  - `requestedAt`
  - `plannedAt`
  - `hasCopy`
  - `hasImages`
  - `requiresReview`
- 阶段至少覆盖：
  - `pending_generation`
  - `waiting_review`
  - `waiting_publish`
  - `publishing`
  - `published`
  - `failed`

2. 新增多账号数据结构
- 增加账号实体或等价的数据组织层，至少包含：
  - `id`
  - `name`
  - `handle`
  - `status`
  - `summary`
  - `lastActiveAt`
- 账号状态至少覆盖：
  - `online`
  - `busy`
  - `offline`

3. 提供最小接口返回
- 评估并实现以下两种方案中更小的一种，但必须保证前端可稳定消费：
  - 在现有接口上补字段
  - 新增轻量聚合接口
- 若采用新增接口方案，本轮优先考虑：
  - `GET /api/tasks`
  - `GET /api/accounts`
- 若采用补字段方案，也必须让前端能稳定得到消息任务视图和账号视图，不依赖前端继续硬编码推断。

4. 补齐归属关系
- `Post` 需要能表达所属账号。
- 消息任务需要能表达关联帖子与所属账号。
- 已发布内容在详情和列表返回中需要能看出账号归属。

5. 更新契约文档
- 若新增接口或新增字段，必须同步更新 `.monkeycode/docs/API_CONTRACT.md`。
- 明确哪些字段是新增稳定字段，哪些仍是本轮占位字段。

6. 测试补强
- 至少补一组消息任务接口或数据映射测试。
- 至少补一组账号聚合接口或归属字段测试。
- 保证现有 API 最小测试不被破坏。

### 本轮实现边界

1. 本轮先做最小后端支撑，不做真实平台扩展
- 不接真实 OpenClaw 消息同步。
- 不接真实小红书多账号登录与会话管理。
- 不做复杂排程、权限系统、账号切换策略。

2. 本轮允许使用占位或推导数据
- 若当前仓储中还没有真实消息任务表，可以先从现有 `posts` 和已知状态推导最小任务视图。
- 若当前还没有真实账号表，可以先引入轻量账号模型或后端聚合映射，但必须收口到稳定返回结构。

3. 本轮优先后端可消费性
- 前端当前已完成页面重构，后端本轮重点是减少前端展示层推断成本。
- 优先让 `/tasks`、`/accounts`、帖子详情中的账号归属拿到明确字段。

### 本轮不要先做

- 不要先做真实聊天消息接入。
- 不要先做真实多账号发布调度。
- 不要先重构现有发布状态机。
- 不要先做大规模数据库迁移或权限系统。

### 建议优先实现顺序

1. 先补模型和枚举
- 为消息任务阶段和账号状态补模型定义与 schema。

2. 再补 repository / service 聚合逻辑
- 先让后端能稳定生成任务列表和账号列表。

3. 最后补 API 和契约文档
- 输出给前端的字段命名稳定后，再同步更新 `API_CONTRACT.md`。

### 完成后回复格式

- commit hash
- commit message
- 改动文件列表
- 新增或修改的接口列表
- 字段结构说明
- 对现有前端页面影响说明
- 测试结果
- `git status --short`

## 第一阶段职责

- 完成 `backend/` 主业务 API 骨架
- 完成草稿、素材、审核、发布、指标快照的数据模型
- 完成草稿 CRUD、审核流转、生成任务入口、发布入口和指标采集入口
- 为 `worker/` 约定任务输入输出结构与状态流转字段

## 当前分配任务

### 第六轮主任务

- 第六轮以后端任务外壳完善和回写链路自动化为主，不再停留在手动触发回写阶段。
- 当前重点是让发布结果回写和指标追加写入具备 worker 自动触发能力，并稳定失败语义。

### 本轮必须交付

1. 发布结果自动回写外壳
- 在 worker 发布任务完成后自动触发 `publish-result` 回写
- 保持当前前端已接通字段稳定，不随意改名

2. 指标快照自动追加外壳
- 在 worker 指标任务完成后自动触发 `metrics-snapshots` 追加写入
- 保持历史快照 append 行为不变，不覆盖已有记录

3. 失败语义收口
- 至少明确可重试失败、不可重试失败、平台限流失败三类语义
- 让前端能够稳定消费失败信息，不依赖自由文本猜测

4. 测试补强
- 补 worker 发布任务完成后的回写测试
- 补 worker 指标任务完成后的追加写入测试

### 本轮不要先做

- 不要先接真实小红书平台全链路
- 不要先扩多账号、定时发布或权限系统
- 不要先做大规模契约重命名

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
- 已完成消息任务最小模型：新增 `MessageTask`，覆盖 `sourceMessage`、`topic`、`stage`、`postId`、`accountId`、`requestedAt`、`scheduledAt`、`hasCopy`、`hasImages`、`requiresHumanReview`。
- 已完成多账号最小模型：新增 `Account`，覆盖 `id`、`name`、`handle`、`status(online|busy|offline)`、`summary`、`lastActiveAt`。
- 已新增最小接口：
  - `GET /api/tasks`（消息任务中心）
  - `GET /api/accounts`（多账号运营页）
- 已补归属关系：`Post` 增加 `accountId`、`messageTaskId`，可在帖子详情和列表看出账号归属及关联任务；任务也返回 `accountId` 与 `postId`。
- 已保持现有链路不破坏：`posts`、`dashboard`、`publish-result`、`metrics-snapshots` 的既有字段和行为保持兼容。
- 已更新 `.monkeycode/docs/API_CONTRACT.md`，补充任务与账号接口、任务阶段和账号状态字段说明。
- 已补最小测试：`backend/tests/test_api_minimal.py::test_tasks_accounts_and_post_ownership`。
- 本轮补口已完成：`/api/tasks` 新增稳定字段 `stageLabel`、`nextAction`、`title`、`accountName`，并统一计划时间字段为 `plannedAt`。
- 本轮补口已完成：`/api/accounts` 新增稳定聚合字段 `todayTaskCount`、`waitingCount`、`publishedCount`、`totalEngagement`、`bestTopic`。
- 已收口字段命名：任务接口保留 `requiresHumanReview` 作为单一人工确认字段；计划时间字段统一为 `plannedAt`（移除 `scheduledAt` 输出）。

## 当前问题
- 当前 `GET /api/tasks` 与 `GET /api/accounts` 为最小可用读接口，创建/更新任务与账号的写接口尚未开放。
- 任务阶段流转目前仍由后端种子和现有发布链路间接驱动，尚未引入真实消息输入与多账号调度逻辑（按本轮边界保留）。
- 当前账号聚合字段仍基于本地快照和最小规则计算，后续如引入真实统计口径需单独校准。

## 需要协作
- 前端需在 `/tasks` 页面确认任务阶段与布尔状态字段（`hasCopy`、`hasImages`、`requiresHumanReview`）映射是否满足展示需求。
- 前端需在 `/accounts` 与内容确认台验证账号归属显示（`accountId`）是否满足当前交互。

## 下一步
- 如前端需要筛选能力，可在不改现有字段前提下补 `GET /api/tasks` / `GET /api/accounts` 的轻量查询参数。
- 保持当前边界，不扩真实聊天接入、真实多账号调度和权限系统，待产品结构稳定后再进入下一阶段设计。
- 等前端移除回退推导后，按实际联调反馈做小范围字段微调，不扩大模型范围。
