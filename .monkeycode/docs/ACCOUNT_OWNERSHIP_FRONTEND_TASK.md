# 前端任务单：账号归属真实化

## 目标

把真实帖子和真实任务的账号展示切到后端真实归属，停止在主路径上使用种子账号伪造“已归属”的页面效果。

## 当前问题

1. `/posts/[id]` 在真实 `post.accountId` 为空时，会回退到展示层种子账号。
2. 这导致像 `post_f01d2157a6` 这样的真实 QQ 帖子，会显示成 `小鹿的穿搭日记`，但这不是后端真实数据。
3. 多账号页面叙事已经存在，但在真实帖子详情场景里还不够真实。

## 本轮边界

1. 本轮只收口账号归属展示，不扩真实小红书发布能力。
2. 本轮不新增复杂账号切换交互。
3. 本轮不要求删除所有 fallback，但要把 fallback 从主路径降级为异常兜底。

## 必须交付

### 1. 收口真实归属展示

1. `/review`
2. `/dashboard`
3. `/posts/[id]`
4. 视情况评估 `/posts`

以上页面在消费到真实接口数据时，应优先展示后端真实 `accountId` / `accountName` 对应的账号归属。

### 2. 调整兜底策略

1. 当接口请求失败时，允许保留整页 fallback。
2. 当接口请求成功但账号归属为空时，不允许继续伪造成某个种子账号已归属。
3. 此时应明确显示：
   - `未分配账号`
   - 或等价中文空态文案

### 3. 收口展示层工具

重点检查并调整：

1. `frontend/src/lib/product.ts`
2. `getAccountForPost`
3. `adaptMessageTasks`
4. `getMessageTaskForPost`

要求：

1. 真实接口有归属时，直接使用真实归属。
2. 真实接口无归属时，主路径展示空态，不再伪造种子账号。
3. 种子账号仅保留给纯演示数据或整页请求失败时使用。

### 4. 页面文案同步

1. 如果当前任务未分配账号，要给出清楚中文提示。
2. 不要让用户误以为系统已经决定了某个账号。
3. 保持 `/tasks`、`/review`、`/dashboard`、`/posts/[id]` 对“未分配账号”的表述一致。

### 5. 验证

必须执行：

1. `cd frontend && npm run lint`
2. `cd frontend && npm run build`

## 建议改动点

1. `frontend/src/lib/product.ts`
2. `frontend/src/app/review/page.tsx`
3. `frontend/src/app/dashboard/page.tsx`
4. `frontend/src/app/posts/page.tsx`
5. `frontend/src/app/posts/[id]/page.tsx`
6. 如有必要，补充 `frontend/src/lib/api/types.ts`

## 验收标准

1. 当后端真实返回 `accountId` / `accountName` 时，页面展示对应真实账号。
2. 当后端真实返回空归属时，页面展示“未分配账号”而不是种子账号。
3. 以 `post_f01d2157a6` 为例，详情页不能再显示伪造的 `小鹿的穿搭日记`。
4. `npm run lint` 通过。
5. `npm run build` 通过。

## 完成后回复格式

1. commit hash
2. commit message
3. 改动文件列表
4. 兜底策略调整说明
5. 页面影响范围说明
6. `npm run lint` 结果
7. `npm run build` 结果
8. `git status --short`
