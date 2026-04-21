# 需求实施计划

## 当前迭代分工

### 第五轮协作决策

- 第五轮由后端主推进，目标从“联调打通”转向“数据持久化与发布/指标链路补全”。
- 前端进入待命验证模式，重点跟进发布状态展示、指标历史展示和真实数据回归。
- 本轮优先保证数据可保留、发布结果可回写、指标快照可落库；不启动真实小红书平台接入。

### 后端第五轮主任务

- 用真实持久化方案替换当前内存仓储，至少完成帖子、素材、审核记录、发布记录、指标快照的可保存能力
- 完善发布结果回写：支持 `published`、`publish_failed`、`platform_post_id`、错误信息回填
- 补指标快照写入入口与追加存储逻辑，保证历史不覆盖
- 为持久化、发布结果回写、指标写入补最小测试

本轮交付标准：

- 服务重启后核心数据不丢失
- `publish` 链路可从 `publishing` 回写到 `published` 或 `publish_failed`
- `platform_post_id` 可被记录并在详情中返回
- 指标快照为追加写入，可在详情或相关接口中读取历史
- 后端更新 `.monkeycode/team-context/backend.md` 同步区，明确本轮持久化范围与未覆盖对象

### 前端第五轮待命任务

- 跟进后端持久化与发布结果回写后的真实状态展示
- 补充 `publishing`、`published`、`publish_failed` 状态反馈展示
- 跟进指标历史或快照展示的真实渲染
- 在依赖可用时补 `next lint` 或 `next build` 验证，并记录环境限制

本轮交付标准：

- 页面可正确展示发布成功、发布失败、发布中三类状态
- 若后端已返回 `platform_post_id` 或错误信息，前端能正确展示
- 若后端已开放指标历史真实数据，前端可替换现有占位展示
- 前端更新 `.monkeycode/team-context/frontend.md` 同步区，明确哪些展示已切到真实数据

### 第四轮协作决策

- 第四轮由后端主推进，目标是补齐前端仍缺失的素材查询、生成入口、发布入口契约。
- 前端进入待命接线模式，后端接口完成后立即接入并移除剩余 mock。
- 本轮仍不启动真实数据库持久化和真实小红书平台接入。

### 后端第四轮主任务

- 补素材查询能力，至少支持帖子详情页把 `assetIds` 渲染成真实素材卡片
- 稳定 `generate-copy`、`generate-images`、`publish` 的请求响应结构和状态字段
- 为生成和发布入口补最小测试覆盖
- 如接口字段调整，必须同步更新 `API_CONTRACT.md`

本轮交付标准：

- 存在可供前端消费的素材查询接口，或在现有详情接口中补足素材展示所需字段
- `generate-copy`、`generate-images`、`publish` 的返回结构已稳定，可直接联调
- 至少补齐一组生成或发布链路测试
- 后端更新 `.monkeycode/team-context/backend.md` 同步区，明确哪些接口已可联调

### 前端第四轮待命任务

- 在后端素材查询能力就绪后，移除素材卡片 mock，改用真实素材数据
- 接通 `generate-copy`、`generate-images`、`publish`
- 验证素材上传后 `assetIds` 刷新，以及看板字段映射与后端一致
- 依赖可用时补 `next lint` 或 `next build` 基础验证

本轮交付标准：

- 素材卡片不再依赖本地 mock
- 页面可触发文案生成、图片生成、发布入口
- 前端同步区明确剩余未接线动作与环境限制

### 第三轮协作决策

- 第三轮由前端主推进，目标是完成真实接口接入和页面联调闭环。
- 后端进入待命支持模式，优先响应前端联调中暴露的字段、校验和小范围接口问题。
- 本轮不启动真实数据库改造，不启动真实发布链路，不扩展趋势看板。

### 前端第三轮任务

- 把 `dashboard`、`posts`、`posts/[id]`、`review` 的主数据全部切到真实接口
- 详情页直接使用后端已固定字段：`reviewRecords`、`publishRecords`、`metricsHistory`
- 接通审核动作、工作台保存、素材上传后的刷新与回填逻辑
- 把 mock 收敛到仅用于无法从当前后端获取的局部占位

本轮交付标准：

- 看板页通过 `GET /api/dashboard/summary` 展示真实聚合数据
- 列表页通过 `GET /api/posts` 展示真实帖子数据
- 详情页通过 `GET /api/posts/{post_id}` 展示真实明细数据
- 审核页可触发 `submit-review`、`approve`、`reject` 并展示结果反馈
- 素材上传后如传入 `postId`，页面能正确感知关联结果
- 前端更新 `.monkeycode/team-context/frontend.md` 同步区，明确剩余 mock 范围

### 后端第三轮待命任务

- 以支持前端联调为第一优先级，修正字段、状态校验、错误返回和素材关联边界
- 若前端联调顺利，则补充素材上传、生成任务入口、看板稳定字段的测试覆盖
- 仅做小范围契约修正，不进行数据库层和真实平台链路重构

本轮交付标准：

- 对前端联调阻塞在同轮内响应并修复
- 若变更接口字段，必须同步更新 `API_CONTRACT.md`
- 补充至少一项联调相关测试覆盖：素材关联、生成任务入口或看板字段稳定性
- 后端更新 `.monkeycode/team-context/backend.md` 同步区，区分“已处理联调问题”和“仍待前端验证”

### 第二轮协作决策

- 本轮优先目标不是接真实数据库，而是先完成前后端联调闭环。
- 后端先稳定接口契约、补齐详情字段、补最小测试、补 worker 入口占位。
- 前端先把 `dashboard`、`posts`、`posts/[id]`、`review` 从 mock 切到真实接口。
- 下一轮再处理数据库持久化与真实发布/采集。

### 前端今天先做

- 把 `dashboard`、`posts`、`posts/[id]`、`review` 接到真实接口
- 统一按后端当前字段消费：`reviewRecords`、`publishRecords`、`metricsHistory`
- 保留现有 UI，不再大改视觉方向，重点完成联调与交互闭环
- 完成工作台中的保存、提交审核、批准、退回动作接线

本轮交付标准：

- 列表页和详情页不再依赖本地 mock 主数据
- 看板页使用 `GET /api/dashboard/summary`
- 详情页使用 `GET /api/posts/{post_id}` 并正确渲染 `reviewRecords`、`publishRecords`、`metricsHistory`
- 审核页可触发 `submit-review`、`approve`、`reject`
- 前端更新 `.monkeycode/team-context/frontend.md` 同步区

### 后端今天先做

- 固定并文档化当前联调字段：`reviewRecords`、`publishRecords`、`metricsHistory`
- 确保 `GET /api/posts/{post_id}`、`GET /api/dashboard/summary` 返回结构稳定
- 补草稿 CRUD、审核流转、发布前状态校验的最小接口测试
- 在 `worker/app` 下补任务入口占位与统一状态流转字段定义

本轮交付标准：

- 详情接口稳定返回前端需要的三个明细字段
- 看板汇总接口保持聚合字段稳定，本轮不扩展趋势维度
- 存在最小测试覆盖草稿、审核、发布校验
- `worker/app/tasks` 存在文案生成、图片生成、发布、指标采集任务占位
- 后端更新 `.monkeycode/team-context/backend.md` 同步区

### 前端本轮先做

- `1.2` 补齐后台路由与统一布局骨架
- `7.1` 实现看板页静态结构与 mock 数据展示
- `7.2` 实现帖子列表页与帖子详情页静态结构
- `7.3` 实现内容工作台与审核页静态交互骨架

本轮交付标准：

- `frontend/src/app` 下存在 `dashboard`、`posts`、`posts/[id]`、`review`、`assets` 路由
- 存在统一后台布局、导航、页面容器和基础卡片组件
- 页面先使用 mock 数据，但字段命名与 `API_CONTRACT.md` 保持一致
- 前端在 `.monkeycode/team-context/frontend.md` 写清已完成内容、问题和下一步

### 后端本轮先做

- `1.1` 补齐后端分层目录、配置加载、数据库入口和路由注册
- `2.1` 创建第一批核心数据模型与状态枚举
- `2.2` 创建草稿、审核、素材、看板相关 Schema
- `4.1` `4.2` `4.3` 实现草稿 CRUD、素材上传占位、审核流转接口
- `5.1` `5.2` `6.1` 先实现生成任务和发布任务的任务记录入口，不要求接入真实平台

本轮交付标准：

- `backend/app` 下存在 `api/routes`、`models`、`schemas`、`services`、`repositories`、`db`
- `backend/app/main.py` 已注册 `/health`、`/api/posts`、`/api/assets`、`/api/dashboard`
- API 能返回基础 JSON 结构，状态流转符合设计文档约束
- 后端在 `.monkeycode/team-context/backend.md` 写清已完成内容、问题和下一步

- [ ] 1. 完善项目基础骨架与核心边界
  - [ ] 1.1 补齐后端 API 分层目录与基础配置
    - 在 `backend/app` 下建立 `api/routes`、`models`、`schemas`、`services`、`repositories`、`db` 目录，对应设计文档中的 `FastAPI Application`、`Draft and Post Domain Service` 与 `Metrics Collector` 组件。
    - 补充配置读取、数据库连接和路由注册入口，覆盖 Requirement 1 的草稿管理入口和 Requirement 4 的数据采集入口。

  - [ ] 1.2 补齐前端后台基础路由与布局骨架
    - 在 `frontend/src/app` 下创建 `dashboard`、`posts`、`review`、`assets` 路由骨架，对应 Requirement 1、Requirement 3、Requirement 4。
    - 定义后台导航、页面布局和统一 API 请求封装，建立前后端边界。

  - [ ] 1.3 补齐 worker 任务分类与任务入口
    - 在 `worker/app` 下创建 `tasks` 目录并拆分文案生成、图片生成、发布、指标采集任务占位，实现设计文档中的 `AI Orchestrator` 与 `Metrics Collector` 对应入口。
    - 约定任务状态字段与任务输入输出结构，支撑 Requirement 2、Requirement 4。

  - [ ]* 1.4 为骨架与基础配置编写验证测试
    - 为后端健康检查、路由注册和配置加载添加基础测试。
    - 为前端页面基础渲染添加最小验证用例。

- [ ] 2. 实现帖子草稿、素材与审核核心数据模型
  - [ ] 2.1 创建 `Post`、`Asset`、`ReviewRecord`、`GenerationTask`、`PublishLog`、`MetricsSnapshot` 数据模型
    - 在后端落库模型中定义字段、状态枚举和关联关系，覆盖设计文档中的全部核心模型。
    - 明确 `Post.status` 合法流转，支撑 Requirement 1、Requirement 3、Requirement 4。

  - [ ] 2.2 创建对应的请求与响应 Schema
    - 为草稿创建、草稿更新、审核提交、审核批准、审核退回、素材上传和看板查询建立 Pydantic Schema。
    - 保证 Schema 与前端所需字段一致，覆盖 Requirement 1、Requirement 3、Requirement 4。

  - [ ] 2.3 实现草稿与审核领域服务
    - 编写草稿创建、更新、提交审核、批准、退回逻辑，确保状态流转符合设计文档 Correctness Properties 1。
    - 记录审核历史与修改记录，覆盖 Requirement 1、Requirement 3。

  - [ ]* 2.4 为状态流转和数据约束编写测试
    - 为 `draft -> in_review -> approved` 流转编写单元测试。
    - 为属性“任一帖子任意时刻只能处于一个合法状态”编写性质测试，对应 Correctness Property 1。

- [ ] 3. 检查点 - 确保所有测试通过
  - 确保所有测试通过,如有疑问请询问用户

- [ ] 4. 实现草稿管理与素材管理 API
  - [ ] 4.1 实现帖子草稿 CRUD 接口
    - 提供 `POST /api/posts`、`GET /api/posts`、`GET /api/posts/{post_id}`、`PATCH /api/posts/{post_id}`。
    - 返回草稿基础信息、状态、最新关联素材和最新任务标识，覆盖 Requirement 1。

  - [ ] 4.2 实现素材上传与关联接口
    - 提供 `POST /api/assets/upload` 和素材关联能力，保证上传图片可挂载到草稿。
    - 覆盖 Requirement 3 中的图片上传、图片选择和失败保护。

  - [ ] 4.3 实现审核流转接口
    - 提供 `POST /api/posts/{post_id}/submit-review`、`approve`、`reject` 接口。
    - 在审核动作中写入 `ReviewRecord`，覆盖 Requirement 3。

  - [ ]* 4.4 为草稿与审核接口编写集成测试
    - 覆盖草稿创建、更新、提交审核、退回和批准流程。
    - 验证非法状态下的接口返回。

- [ ] 5. 实现 AI 生成任务主链路
  - [ ] 5.1 实现文案生成任务创建与结果回填
    - 提供 `POST /api/posts/{post_id}/generate-copy`，创建文案生成任务并持久化请求参数。
    - 设计任务结果回填机制，把生成标题、正文、标签写回草稿修订内容，覆盖 Requirement 2。

  - [ ] 5.2 实现图片生成任务创建与素材入库
    - 提供 `POST /api/posts/{post_id}/generate-images`，创建图片任务并把成功结果登记为 `Asset`。
    - 在任务失败时保留原草稿内容，覆盖 Requirement 2、Requirement 3。

  - [ ] 5.3 实现 worker 侧任务占位执行逻辑
    - 为文案生成与图片生成任务提供基础执行函数和失败记录逻辑。
    - 统一 `GenerationTask` 的 `pending/running/succeeded/failed` 状态流转，覆盖 Requirement 2。

  - [ ]* 5.4 为生成任务状态和结果一致性编写测试
    - 验证生成任务成功后必须落库并关联到对应 `Post`，对应 Correctness Property 3。
    - 验证失败时原草稿不被破坏。

- [ ] 6. 实现发布与指标采集主链路
  - [ ] 6.1 实现发布任务入口与去重保护
    - 提供 `POST /api/posts/{post_id}/publish`，仅允许 `approved` 状态草稿进入 `publishing`。
    - 记录 `PublishLog` 并阻止重复发布，覆盖 Requirement 4 与 Correctness Property 6。

  - [ ] 6.2 实现发布结果回写与失败处理
    - 在发布成功时回写 `platform_post_id` 和 `published` 状态。
    - 在失败时回写 `publish_failed` 和错误信息，覆盖 Requirement 4、Correctness Property 2。

  - [ ] 6.3 实现指标采集任务与快照存储
    - 为 `published` 帖子建立采集入口，存储浏览、点赞、收藏、评论和关注转化快照。
    - 采用追加存储方式保存 `MetricsSnapshot`，覆盖 Requirement 4 与 Correctness Property 4。

  - [ ]* 6.4 为发布与指标采集编写测试
    - 验证发布中状态不可重复触发，对应 Correctness Property 6。
    - 验证指标快照追加存储不覆盖历史值，对应 Correctness Property 4。

- [ ] 7. 实现前端后台最小可用页面
  - [ ] 7.1 实现数据看板页面
    - 对接 `GET /api/dashboard/summary`，展示帖子数、浏览、点赞、收藏、评论、关注转化。
    - 覆盖 Requirement 4 中的后台数据展示需求。

  - [ ] 7.2 实现帖子列表与详情页
    - 展示帖子状态、发布时间、最新指标和进入详情的入口。
    - 在详情页展示草稿内容、审核记录、发布记录和指标历史，覆盖 Requirement 1、Requirement 4。

  - [ ] 7.3 实现内容工作台与审核页
    - 支持输入主题、编辑标题正文、上传图片、触发文案生成与图片生成、提交审核。
    - 支持审核批准、退回和修改后再次保存，覆盖 Requirement 1、Requirement 2、Requirement 3。

  - [ ]* 7.4 为前端主流程编写页面测试
    - 验证工作台表单、帖子列表筛选和审核交互。
    - 为属性“审核前禁止发布未通过草稿”编写流程校验测试，对应 Correctness Property 1 与 6。

- [ ] 8. 检查点 - 确保所有测试通过
  - 确保所有测试通过,如有疑问请询问用户
