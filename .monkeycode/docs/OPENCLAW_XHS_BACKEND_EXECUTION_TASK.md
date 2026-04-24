# OpenClaw 到小红书闭环后端执行任务单

## 适用范围

本任务单承接以下两份产品文档：

1. `.monkeycode/docs/PRODUCT_FLOW_OPENCLAW_TO_XHS.md`
2. `.monkeycode/docs/XHS_DATA_SYNC_PRODUCT_FLOW.md`

目标是把后端缺失能力拆成可执行事项，明确哪些已完成，哪些仍需补齐，避免重复开发已闭环部分。

## 后端已经完成的部分

1. 已接住 OpenClaw / QQ 入站消息，并创建真实 `message task`。
2. 已完成幂等去重，支持按 `source + eventId` 去重。
3. 已打通 `message task -> post -> /review` 承接链路。
4. 已补齐真实生成状态基础链路：`pending_generation -> copy_generated -> images_generated -> waiting_review`。
5. 已支持审核动作回写，并完成 `approved / draft` 基础流转。
6. 已接入 OpenClaw 发布 webhook 执行结果回写，支持 `publishing -> published / publish_failed`。
7. 已能为前端 `/tasks`、`/review`、`/dashboard`、`/posts/[id]` 提供真实主路径数据。

## 后端仍需补齐的能力

### 一. 统一双端确认对象

#### 目标

让 OpenClaw 与网页端操作的始终是同一份确认对象，而不是“网页一份、QQ 一份”。

#### 必须交付

1. 为 `post` 稳定补齐“当前确认版”字段，至少能区分：
   - 候选文案
   - 当前确认文案
   - 候选图片
   - 当前确认图片
2. 提供稳定接口，允许 OpenClaw 通过后端读取当前确认版内容。
3. 提供稳定接口，允许 OpenClaw 把“用户在 QQ 中选中的版本”回写给后端。
4. 确保网页端修改确认版后，OpenClaw 读到的是同一版结果。

#### 建议接口

1. `GET /api/posts/{id}` 持续作为统一详情来源。
2. 增加轻量确认动作接口，例如：
   - `POST /api/posts/{id}/select-copy`
   - `POST /api/posts/{id}/select-assets`
   - 或一个合并的 `POST /api/posts/{id}/selection`

### 二. 增加 OpenClaw 指令承接接口

#### 目标

支持 OpenClaw 把用户在 QQ 中的“就发这个”“查看结果”“刷新数据”等指令转成后端动作。

#### 必须交付

1. 定义并实现 OpenClaw 指令入站接口。
2. 最少支持以下动作：
   - 确认当前版本
   - 触发发布
   - 查询当前状态
   - 触发数据同步
3. 保持幂等，避免 OpenClaw 重发消息造成重复发布。

### 三. 完整化发布状态机

#### 目标

把“执行成功”和“平台审核通过”区分开，避免状态语义不清。

#### 必须交付

1. 在后端状态语义中补齐：
   - `under_review`
   - `rejected`
2. 明确区分：
   - `publishing`：OpenClaw 正在执行提交
   - `under_review`：平台已接收，等待审核
   - `published`：审核通过并公开
   - `rejected`：审核未通过
   - `publish_failed`：OpenClaw 执行阶段失败
3. 保持前端已有 `published / publish_failed` 链路兼容，不要直接破坏现有页面。

### 四. 补齐账号接入与同步元数据

#### 目标

让后台明确知道“当前账号是否已接入小红书、登录态是否有效、最近一次同步何时成功”。

#### 必须交付

1. 在账号实体或等价聚合层增加：
   - `connectionStatus`
   - `reauthRequired`
   - `lastSyncAt`
   - `lastSyncStatus`
   - `lastSyncError`
2. 对外提供账号接入状态接口，供前端展示和 OpenClaw 判断是否需要提醒。

### 五. 补齐作品数据同步能力

#### 目标

在发布完成后，能把小红书真实作品数据拉回后台。

#### 必须交付

1. 提供最小数据同步入口：
   - 手动触发同步
   - 自动触发同步中的至少一种
2. 数据模型至少支持：
   - `platformPostId`
   - `platformUrl`
   - `publishedAt`
   - `likeCount`
   - `collectCount`
   - `commentCount`
   - `reviewStatus`
   - `metricsHistory`
3. 区分“发布回写”与“数据同步回写”两类事件。
4. 当同步失败时，记录同步失败原因，而不是复用发布失败原因。

#### 建议接口

1. `POST /api/accounts/{id}/sync-posts`
2. `POST /api/posts/{id}/sync-metrics`
3. `GET /api/accounts/{id}` 返回同步元数据
4. `GET /api/posts` / `GET /api/posts/{id}` 返回真实互动数据

### 六. 统一契约与测试

#### 必须交付

1. 更新 `.monkeycode/docs/API_CONTRACT.md`。
2. 为新增状态、同步接口、OpenClaw 指令接口补最小测试。
3. 至少覆盖：
   - 重复触发发布不重复创建执行
   - 重复触发同步不写脏数据
   - `under_review -> published / rejected` 状态流转
   - 数据同步失败时错误字段稳定返回

## 不属于后端当前轮的事情

1. 不负责 QQ 对话文案设计。
2. 不负责前端 UI 和交互布局。
3. 不负责浏览器自动化脚本细节。

## 后端完成标准

当以下条件成立时，可认为后端侧闭环完成：

1. OpenClaw 与网页端都基于同一条 `post` 做确认和发布。
2. 发布状态语义已稳定覆盖 `approved -> publishing -> under_review -> published/rejected` 与 `publish_failed`。
3. 账号接入状态、同步状态和最近同步时间可被前端读取。
4. 作品点赞、收藏、评论和状态能以真实数据返回给前端。
5. OpenClaw 能通过后端安全触发“确认、发布、查状态、同步数据”四类动作。
