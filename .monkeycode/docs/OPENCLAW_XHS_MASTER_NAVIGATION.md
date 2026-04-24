# OpenClaw 小红书项目总导航

## 文档目标

本文件作为当前阶段的统一导航入口，帮助前端、后端与 OpenClaw 三方快速理解：

1. 这个项目现在到底要做什么。
2. 当前已经做到哪里。
3. 接下来谁先做什么。
4. 每一方应该先看哪些文档。

## 一句话目标

把“QQ / OpenClaw 发需求 -> 后台生成文案和图片 -> QQ 与网页端展示同一份候选内容 -> 用户在任一端确认 -> OpenClaw 发布到小红书 -> 小红书审核与发布结果双端同步 -> 后台自动拉取点赞收藏评论等数据”做成真实可用闭环。

## 当前主链路

### 已经成立的部分

1. `QQ -> OpenClaw -> backend` 入站链路已成立。
2. backend 已能创建真实 `message task` 和 `post`。
3. `/tasks`、`/review`、`/dashboard`、`/posts/[id]` 已能消费真实主路径数据。
4. 真实生成状态链路已补齐基础阶段。
5. OpenClaw 发布 webhook 已存在，并支持异步回写。
6. OpenClaw 浏览器环境已安装，已能访问小红书页面。

### 还未完全成立的部分

1. OpenClaw 还需把候选文案和候选图片真实回发到 QQ。
2. OpenClaw 还需承接 QQ 中的“发这个 / 选图 / 选文案 / 查状态”指令。
3. OpenClaw 还需完成真实小红书登录态保存与复用。
4. 后端还需补齐 `under_review / rejected` 状态语义。
5. 后端与 OpenClaw 还需补齐作品数据回收链路。
6. 前端还需补齐账号接入状态、同步状态和真实数据展示收口。

## 推荐阅读顺序

### 第 1 层：先理解产品目标

1. `.monkeycode/docs/PRODUCT_FLOW_OPENCLAW_TO_XHS.md`
2. `.monkeycode/docs/XHS_DATA_SYNC_PRODUCT_FLOW.md`
3. `.monkeycode/docs/XHS_LOGIN_STATE_STRATEGY.md`

### 第 2 层：再看整体执行顺序

1. `.monkeycode/docs/OPENCLAW_XHS_REMAINING_WORK_PLAN.md`

### 第 3 层：再看自己所属角色的执行任务单

#### 后端

1. `.monkeycode/docs/OPENCLAW_XHS_BACKEND_EXECUTION_TASK.md`
2. `.monkeycode/docs/XHS_LOGIN_STATE_BACKEND_TASK.md`

#### 前端

1. `.monkeycode/docs/OPENCLAW_XHS_FRONTEND_EXECUTION_TASK.md`
2. `.monkeycode/docs/XHS_LOGIN_STATE_FRONTEND_TASK.md`

#### OpenClaw

1. `.monkeycode/docs/OPENCLAW_XHS_OPENCLAW_EXECUTION_TASK.md`
2. `.monkeycode/docs/XHS_LOGIN_STATE_OPENCLAW_TASK.md`
3. `.monkeycode/docs/OPENCLAW_PUBLISH_WEBHOOK_DESIGN.md`
4. `.monkeycode/docs/OPENCLAW_BACKEND_TASK.md`

## 各方职责摘要

### 后端负责

1. 维护统一的 `message task / post / account` 对象。
2. 提供 OpenClaw 与网页端共用的确认对象和状态接口。
3. 承接发布回写、审核状态和数据同步结果。
4. 表达账号接入状态、登录态失效状态和同步状态。

### 前端负责

1. 把 QQ/OpenClaw 与网页端共用同一份内容对象这件事展示清楚。
2. 展示账号接入状态、同步状态、发布状态和互动数据。
3. 提供网页端确认入口、刷新入口和错误提示。
4. 逐步清理真实接口成功场景下的演示兜底。

### OpenClaw 负责

1. 承接 QQ 消息入口。
2. 把后台生成结果回发到 QQ。
3. 承接 QQ 中的确认和查询指令。
4. 建立并复用小红书登录态。
5. 执行真实发布。
6. 拉取小红书作品与互动数据，并回写 backend。

## 当前优先级

### P0

1. OpenClaw 回发候选内容到 QQ。
2. OpenClaw 承接 QQ 指令。
3. OpenClaw 完成真实登录态复用。
4. OpenClaw 完成一次真实发布提交。

### P1

1. 后端补齐 `under_review / rejected`。
2. 后端补齐统一确认对象接口。
3. 前端补齐账号接入状态和同一确认对象表达。

### P2

1. OpenClaw 拉取作品和互动数据。
2. 后端保存同步数据和指标历史。
3. 前端展示点赞、收藏、评论、审核状态和刷新入口。

## 三方启动建议

### OpenClaw 先启动

原因：当前最大的真实阻塞点集中在 OpenClaw 侧，尤其是 QQ 回发、QQ 指令、登录态复用和真实发布。

### 后端第二批启动

原因：后端很多新增能力依赖 OpenClaw 先给出真实指令和真实平台结果，过早做会变成空壳。

### 前端最后收口

原因：前端主结构已经比较完整，更多是等后端和 OpenClaw 给出稳定字段后完成展示收口。

## 里程碑

### 里程碑 1：QQ 与网页双端确认闭环

完成标志：

1. QQ 能收到候选文案和候选图片。
2. 用户能在 QQ 中直接说“发这个”。
3. 网页端同步看到同一确认结果。

### 里程碑 2：真实小红书发布闭环

完成标志：

1. OpenClaw 已具备可复用登录态。
2. 已完成一次真实发布提交。
3. 平台审核中、已发布、审核未通过、执行失败都能正确表达。

### 里程碑 3：发布后数据闭环

完成标志：

1. 登录后台后能看到真实作品数据。
2. 能看到点赞、收藏、评论、发布时间和审核状态。
3. 登录态失效和同步失败能明确提示。

## 文档清单

### 产品与策略

1. `.monkeycode/docs/PRODUCT_FLOW_OPENCLAW_TO_XHS.md`
2. `.monkeycode/docs/XHS_DATA_SYNC_PRODUCT_FLOW.md`
3. `.monkeycode/docs/XHS_LOGIN_STATE_STRATEGY.md`

### 总体推进

1. `.monkeycode/docs/OPENCLAW_XHS_REMAINING_WORK_PLAN.md`
2. `.monkeycode/docs/OPENCLAW_XHS_MASTER_NAVIGATION.md`

### 后端执行

1. `.monkeycode/docs/OPENCLAW_XHS_BACKEND_EXECUTION_TASK.md`
2. `.monkeycode/docs/XHS_LOGIN_STATE_BACKEND_TASK.md`

### 前端执行

1. `.monkeycode/docs/OPENCLAW_XHS_FRONTEND_EXECUTION_TASK.md`
2. `.monkeycode/docs/XHS_LOGIN_STATE_FRONTEND_TASK.md`

### OpenClaw 执行

1. `.monkeycode/docs/OPENCLAW_XHS_OPENCLAW_EXECUTION_TASK.md`
2. `.monkeycode/docs/XHS_LOGIN_STATE_OPENCLAW_TASK.md`
3. `.monkeycode/docs/OPENCLAW_PUBLISH_WEBHOOK_DESIGN.md`
4. `.monkeycode/docs/OPENCLAW_BACKEND_TASK.md`

### 历史与基础参考

1. `.monkeycode/docs/API_CONTRACT.md`
2. `.monkeycode/docs/QQ_INGEST_HANDOFF.md`
3. `.monkeycode/docs/OPENCLAW_QQ_FORWARD_INSTRUCTION.md`
4. `.monkeycode/docs/NEXT_PHASE_EXECUTION_PLAN.md`

## 建议转发方式

### 发给 OpenClaw

先发：

1. `.monkeycode/docs/OPENCLAW_XHS_MASTER_NAVIGATION.md`
2. `.monkeycode/docs/OPENCLAW_XHS_REMAINING_WORK_PLAN.md`
3. `.monkeycode/docs/OPENCLAW_XHS_OPENCLAW_EXECUTION_TASK.md`
4. `.monkeycode/docs/XHS_LOGIN_STATE_OPENCLAW_TASK.md`

### 发给后端

先发：

1. `.monkeycode/docs/OPENCLAW_XHS_MASTER_NAVIGATION.md`
2. `.monkeycode/docs/OPENCLAW_XHS_REMAINING_WORK_PLAN.md`
3. `.monkeycode/docs/OPENCLAW_XHS_BACKEND_EXECUTION_TASK.md`
4. `.monkeycode/docs/XHS_LOGIN_STATE_BACKEND_TASK.md`

### 发给前端

先发：

1. `.monkeycode/docs/OPENCLAW_XHS_MASTER_NAVIGATION.md`
2. `.monkeycode/docs/OPENCLAW_XHS_REMAINING_WORK_PLAN.md`
3. `.monkeycode/docs/OPENCLAW_XHS_FRONTEND_EXECUTION_TASK.md`
4. `.monkeycode/docs/XHS_LOGIN_STATE_FRONTEND_TASK.md`
