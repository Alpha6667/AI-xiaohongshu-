# 2026-05-12 前端交接文档

## 当前状态

前端已经完成信息架构清爽化改版，并支持人工验证错误码展示。页面可用于查看消息任务、账号运营、发布中心、帖子详情、素材和 metrics。

## 关键提交

```text
effb44be2c32ba4f4692db24d4eb6e9c8809d369 feat(frontend): streamline dashboard information architecture
d9677dcf0faed0f305318a6e6c313ea96ee5f14f fix: show manual verification metrics state
```

## 主要改动

1. 新增或完善通用组件：`HelpTip`、`CompactStatus`、`CollapsibleDetails`。
2. 首页改为优先展示今天最该处理的任务、发布失败和账号异常。
3. 消息任务中心改为紧凑任务列表。
4. 多账号运营页将账号异常和可用性前置。
5. 发布中心在 `/posts` 中展示状态分类、素材、metrics、数据来源和操作。
6. 帖子详情页首屏展示标题、正文、标签、素材、发布状态、`platformPostId` 和 metrics。
7. `post_needs_manual_verification` 映射为用户可读文案。

## 制作过程中遇到的问题与解决方案

1. 页面信息密度过高，状态文案和说明内容重复出现。解决方案：将首页、任务中心、账号页、发布中心和详情页统一改成“关键状态、关键数据、下一步动作”优先展示，说明性内容收进 `HelpTip` 或详情区。
2. `/posts` 和 `/posts/[id]` 需要同时展示真实数据来源、同步状态、metrics 快照和素材信息。解决方案：把状态判断集中到 `frontend/src/lib/product.ts`，页面只消费标准化后的 label、detail 和 tone。
3. 本地素材路径无法被浏览器直接访问。解决方案：前端只展示后端返回的 `asset.url`，当前约定为 `/api/assets/{assetId}/content`，不拼接或暴露服务器本地路径。
4. `post_needs_manual_verification` 原始错误码对用户不可读。解决方案：在 `getSyncErrorLabel` 中做最小文案映射，并复用到同步状态、数据来源失败说明、帖子详情同步错误、账号作品同步列表和刷新按钮失败提示。
5. 临时干净 worktree 缺少 `node_modules` 导致 `next` 命令不可用。解决方案：复用已有 `/workspace/frontend/node_modules` 作为临时 symlink 运行构建，该 symlink 保持未跟踪且未提交。

## 关键文件

```text
frontend/src/components/ui.tsx
frontend/src/components/refresh-metrics-button.tsx
frontend/src/lib/product.ts
frontend/src/app/page.tsx
frontend/src/app/tasks/page.tsx
frontend/src/app/accounts/page.tsx
frontend/src/app/dashboard/page.tsx
frontend/src/app/posts/page.tsx
frontend/src/app/posts/[id]/page.tsx
frontend/src/styles/globals.css
```

关键文件说明：

1. `frontend/src/lib/product.ts`：集中处理发布状态、审核状态、同步状态、数据来源、人工验证错误文案和运营筛选逻辑。
2. `frontend/src/components/refresh-metrics-button.tsx`：刷新 metrics 的用户反馈入口，包含 `post_needs_manual_verification` 的按钮级失败提示。
3. `frontend/src/app/posts/page.tsx`：发布中心列表，展示发布状态、素材、5 项 metrics、数据来源和最近同步状态。
4. `frontend/src/app/posts/[id]/page.tsx`：帖子详情页，展示正文、标签、素材、发布回写、metrics 快照、历史记录和同步错误。
5. `frontend/src/app/accounts/page.tsx`：账号运营页，展示账号同步状态和作品同步错误文案。
6. `frontend/src/styles/globals.css`：承载紧凑布局、状态卡、表格、素材预览、tooltip 和移动端样式。

## 已验收页面

1. 首页：今日任务、已生成、待确认、最近发布进展清晰展示。
2. 消息任务中心：紧凑卡片展示消息原文、任务类型、内容准备度、时间和链接。
3. 多账号运营：账号概览、账号状态、同步记录展示正常。
4. 发布中心：能区分已发布、发送中、发送失败。
5. 帖子详情页：显示标题、正文、标签、素材、发布结果、metrics 快照和 OpenClaw 发送记录。

## 人工验证错误展示

当后端返回：

```text
lastSyncStatus = failed
syncError = post_needs_manual_verification
```

前端展示：

```text
需要在小红书官方页面完成人工验证后再刷新数据
```

刷新按钮失败提示：

```text
刷新数据失败：需要在小红书官方页面完成人工验证后再刷新数据。
```

## 构建状态

前端构建已通过：

```bash
pnpm --dir frontend build
```

构建过程中仍提示项目未安装 ESLint，这是当前工程现状；Next build 已完成编译、类型检查、页面生成和构建产物输出。

## 测试命令

```bash
pnpm --dir frontend build
```

已知构建输出特征：

1. `Compiled successfully`。
2. `Generating static pages (12/12)`。
3. `Finalizing page optimization`。
4. `Collecting build traces`。
5. 构建期间可能打印 `ESLint must be installed in order to run during builds`，但当前已知环境下 Next build 仍完成构建。

建议人工验收路径：

```text
/posts
/posts/post_9100f36d13
/accounts
```

## 当前注意事项

1. 生产页面看不到更新时，优先确认服务器是否拉取最新交付分支、重新 build 并重启前端服务。
2. 若详情页仍显示旧的“素材加载失败”，优先清理 SSR/浏览器缓存并确认 `/api/assets/{assetId}/content` 可访问。
3. 不要修改后端素材接口和 OpenClaw 发布逻辑。
4. 继续保持页面简洁，长说明通过 `HelpTip` 展示。
5. 前端只展示后端返回的 `status`、`platformPostId`、`latestMetrics`、`metricsHistory`、`lastSyncStatus` 和 `syncError`，不要在页面层伪造发布状态或 metrics。
6. `source=xhs_creator_center` 展示为真实数据，`source=mock` 展示为测试数据，历史错误 source 只能作为排查线索。
7. 后续新增错误码时，优先在 `frontend/src/lib/product.ts` 增加集中映射，再由各页面复用。
8. 不要提交 `frontend/node_modules`、`.next`、`.env` 或任何含 token/Cookie/profile 的文件。

## 下一步前端优化建议

1. 增加部署版本号或 commit hash 显示，方便判断页面是否为最新构建。
2. 增加刷新 metrics 的状态提示和失败引导。
3. 将发布状态、账号状态、数据状态进一步统一为同一套视觉组件。
4. 为移动端列表做更细的卡片压缩。
