# 后端任务单：真实生成链路承接

## 目标

把真实 QQ / OpenClaw 入站任务从 `pending_generation` 继续推进到“文案已生成、图片已生成、可进入确认台”的可消费状态，让 `/tasks`、`/review`、`/posts/[id]` 后续看到的是后端真实生成结果，而不是长期停留在占位态。

## 当前问题

1. 真实 QQ 入站任务已经能创建 `message task` 和 `post`，但主状态仍长期停留在 `pending_generation`。
2. 前端虽然已完成账号归属真实化，但还没有真实生成结果可承接。
3. `/review` 还不能稳定区分“真实候选内容已经生成”还是“当前只是空态占位”。

## 本轮边界

1. 本轮只做生成链路承接，不扩真实小红书发布。
2. 本轮不要求引入真实 AI 服务，允许先用受控生成或最小占位生成，但状态推进和字段回写必须真实可用。
3. 本轮不要求做复杂任务队列系统重构。
4. 本轮不破坏现有 QQ 入站、`task -> post` 承接、账号归属和人工审核链路。

## 必须交付

### 1. 明确最小生成状态流转

至少补齐并稳定返回以下阶段中的可用子集，推荐完整覆盖：

1. `pending_generation`
2. `copy_generated`
3. `images_generated`
4. `waiting_review`
5. `approved`

要求：

1. 这些状态要能映射到真实 `message task.stage`。
2. 如需兼容当前前端字段，继续稳定返回 `stageLabel`、`nextAction`、`hasCopy`、`hasImages`、`requiresHumanReview`。
3. 不允许“文案和图片都已就绪，但任务仍长期返回 `pending_generation`”这种主路径脏状态。

### 2. 明确文案生成承接方式

1. 当文案已生成时，后端要把结果稳定写到 `post` 可消费字段中。
2. 至少保证 `/review` 和 `/posts/[id]` 读取到的标题、正文、标签来自这次生成结果，而不是长期依赖 seed 或空白默认值。
3. 如果当前有多个候选版本，允许先只落一个“当前推荐版”，但要保证后续可扩展。

### 3. 明确图片生成承接方式

1. 当图片已生成时，后端要把结果稳定挂到 `post` 相关素材结构上。
2. `/api/posts/{id}` 返回中应能让前端识别“已有真实素材可选”。
3. 如果当前还没有真实图片服务，允许先生成最小素材占位记录，但该记录必须走真实接口字段，不允许只靠前端假图兜底。

### 4. 明确进入确认台条件

1. 当文案和图片都达到最小可确认条件时，任务需进入 `waiting_review`。
2. `requiresHumanReview`、`stageLabel`、`nextAction` 要与该状态一致。
3. `/tasks` 页面后续看到的任务准备度要与 `/review` 中能否消费候选内容一致。

### 5. 保持与帖子模型一致

1. `message task` 的生成状态和 `post` 当前内容不能互相矛盾。
2. 如果 `hasCopy=true`，则 `post` 主路径上要有可读标题/正文。
3. 如果 `hasImages=true`，则 `post` 主路径上要有可读素材记录。

### 6. 保持老链路兼容

1. 不破坏现有 seed 数据与已发布样本。
2. 不破坏 `/review` 审核动作、`/dashboard` 状态展示、`/posts/[id]` 详情页读取。
3. 不破坏已完成的账号归属真实化。

### 7. 更新契约文档

同步更新 `.monkeycode/docs/API_CONTRACT.md`，至少明确：

1. 生成链路使用的稳定阶段枚举
2. `hasCopy`、`hasImages`、`requiresHumanReview` 的真实含义
3. `GET /api/tasks` 与 `GET /api/posts/{id}` 如何表达“已生成但待确认”

### 8. 补测试

至少补以下测试：

1. 真实入站任务可从 `pending_generation` 推进到“文案已生成”
2. 文案和图片都准备完成后，任务进入 `waiting_review`
3. 任务状态与 `post` 内容/素材不矛盾
4. 重复触发同一生成动作时，不产生脏状态覆盖或重复脏数据

## 建议改动点

优先检查以下位置：

1. `backend/app/services/integrations.py`
2. `backend/app/services/posts.py`
3. `backend/app/models/` 下与 task / post / asset 相关模型
4. `backend/app/schemas/tasks.py`
5. `backend/app/schemas/posts.py`
6. `backend/app/repositories/memory.py`
7. `backend/tests/test_api_minimal.py`
8. `backend/tests/test_repository_persistence.py`

## 验收标准

1. 任选一条真实 QQ 任务，可以从 `pending_generation` 推进到可确认状态。
2. `/api/tasks` 中能看到该任务的真实准备度变化，而不是一直停在 `待生成`。
3. `/api/posts/{id}` 中能看到这次生成后的真实标题、正文或素材结果。
4. 后续前端 `/review` 和 `/posts/[id]` 能承接这些真实结果，而不需要继续长期依赖展示层占位。

## 完成后回复格式

1. commit hash
2. commit message
3. 改动文件列表
4. 生成状态流转说明
5. 生成结果写入位置说明
6. 新增或变更字段说明
7. 测试结果
8. `git status --short`
