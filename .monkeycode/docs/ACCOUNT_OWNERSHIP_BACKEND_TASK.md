# 后端任务单：账号归属真实化

## 目标

把真实 QQ / OpenClaw 入站任务对应的 `message task` 与 `post` 账号归属补齐，停止让前端依赖种子账号兜底判断真实归属。

## 当前问题

1. 真实 QQ 验收帖子如 `post_f01d2157a6`、`post_d61a46fec4` 当前 `post.accountId` 为空。
2. 对应 `taskmsg_b80b8d58a6`、`taskmsg_73add209da` 的 `accountId`、`accountName` 也为空。
3. 前端详情页因此回退到了种子账号展示，导致“多账号视角”不是真实数据。

## 本轮边界

1. 本轮只做账号归属真实化，不扩真实小红书发布。
2. 本轮不做多账号自动分配策略系统，只需提供稳定、可解释的归属规则。
3. 本轮不改现有 `/review`、`/dashboard`、`/posts` 主链路语义。

## 必须交付

### 1. 明确归属规则

1. 为真实 QQ / OpenClaw 入站任务定义单一归属来源。
2. 如果当前只有默认账号，允许先采用“默认运营账号”规则。
3. 该规则必须能稳定复现，不能随机分配。
4. 规则要写进代码和接口契约，不允许只存在于实现猜测里。

### 2. 补齐任务归属字段

1. 真实 `message task` 创建时稳定写入：
   - `accountId`
   - `accountName`
2. `GET /api/tasks` 返回中，同一条真实任务不能再长期返回空归属。

### 3. 补齐帖子归属字段

1. 真实 `post` 创建或关联时稳定写入 `accountId`。
2. `GET /api/posts` 与 `GET /api/posts/{id}` 对同一条真实帖子返回一致的归属字段。
3. `messageTask.postId`、`post.messageTaskId`、`task.accountId`、`post.accountId` 四者在主路径上要能互相追溯。

### 4. 保持老链路兼容

1. 不破坏既有 seed 数据。
2. 不破坏已完成的 QQ 入站幂等去重。
3. 不破坏 `/api/tasks`、`/review`、`/dashboard`、`/posts/[id]` 当前可用链路。

### 5. 更新契约文档

1. 同步更新 `.monkeycode/docs/API_CONTRACT.md`。
2. 明确以下字段现在是主路径稳定字段：
   - `task.accountId`
   - `task.accountName`
   - `post.accountId`

### 6. 补测试

至少补以下测试：

1. 真实 QQ 入站任务创建后带账号归属。
2. 真实任务自动承接 `post` 后，`task.accountId` 与 `post.accountId` 一致。
3. 同一 `eventId` 重放时，不会出现账号归属脏写或重复写错。

## 建议改动点

优先检查以下位置：

1. `backend/app/services/integrations.py`
2. `backend/app/schemas/tasks.py`
3. `backend/app/schemas/posts.py`
4. `backend/app/services/posts.py`
5. `backend/app/repositories/memory.py`
6. `backend/tests/test_api_minimal.py`
7. `backend/tests/test_repository_persistence.py`

## 验收标准

1. 重新创建一条真实 QQ 测试任务后，`/api/tasks` 中该任务带非空 `accountId`、`accountName`。
2. 该任务关联的 `/api/posts/{id}` 返回非空 `accountId`。
3. `/review`、`/dashboard`、`/posts/[id]` 后续消费到的是后端真实归属，不再需要前端种子账号主路径兜底。

## 完成后回复格式

1. commit hash
2. commit message
3. 改动文件列表
4. 账号归属规则说明
5. 新增或变更字段说明
6. 测试结果
7. `git status --short`
