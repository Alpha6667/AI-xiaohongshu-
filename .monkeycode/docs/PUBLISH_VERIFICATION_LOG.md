# 发布验收记录

## 记录原则

每次真实发布、真实 metrics 抓取和生产恢复都应记录关键证据，方便换模型或协作者继续判断当前状态。

## 已验证能力

### 真实 metrics

主验证帖：

```text
postId = post_3b524758e2
platformPostId = 6a0213f4000000003502327e
```

验收要点：

1. OpenClaw 可以通过真实 noteId 精准匹配创作者中心卡片。
2. `source` 对外统一为 `xhs_creator_center`。
3. 前端显示浏览、点赞、收藏、评论、关注转化。
4. `lastSyncStatus=succeeded` 且 `syncError=null`。

### 真实图文发布

验证帖：

```text
postId = post_9100f36d13
platformPostId = 6a026a40000000003600289d
title = 「永失吾爱·破败之影」——佛耶戈的孤寂与宿命
assetId = asset_3876dcbec3
```

验收要点：

1. OpenClaw 完成真实图片上传和发布。
2. 正文末尾包含 `#英雄联盟 #佛耶戈`。
3. 创作者中心确认只发布 1 条。
4. 后端保存真实 `platformPostId`。
5. `refresh-metrics` 成功返回 `source=xhs_creator_center`。

### 图片展示

验证素材：

```text
assetId = asset_3876dcbec3
```

验收要点：

1. 浏览器通过 `/api/assets/asset_3876dcbec3/content` 访问图片。
2. 响应为 `HTTP 200 image/png`。
3. API response 不暴露 `/root/.openclaw/...`。
4. 发布 payload 给 OpenClaw 仍保留原始本地素材路径。

## 已发现并固化的故障

1. 后端缺少 `OPENCLAW_PUBLISH_WEBHOOK_URL` 会导致状态进入 `publishing` 但 OpenClaw 未收到请求。
2. tags 拼接代码曾出现 `body is not defined`，修复后采用 `body + "\n\n#标签"`。
3. 曾出现伪造 `xh_realtime_...` 污染状态，后续强制禁止模拟 `platformPostId`。
4. 发布失败恢复必须通过后端 repository/service 方法。
5. `curl` 在低配服务器上可能被 kill，可用 Python `requests` 做接口验证。

## 2026-05-12 前端 UI 改版验收

前端改版提交：

```text
effb44be2c32ba4f4692db24d4eb6e9c8809d369
```

远程分支：

```text
260509-chore-add-final-archive
```

构建结果：

```text
pnpm --dir frontend build 通过
```

验收结果：

1. 首页通过：今日任务数、已生成、待确认和最近发布进展清晰展示。
2. 消息任务中心通过：任务以紧凑卡片展示，包含消息原文、系统任务类型、内容准备度、消息时间和操作链接。
3. 多账号运营通过：账号概览展示已连接、需重新登录、同步中、同步失败；账号卡片展示连接状态、同步状态、今日任务、待处理、已发布和最近互动。
4. 发布中心通过：`/posts` 表格可以区分已发布、发送中、发送失败，展示分类、标题、账号、状态、`platformPostId`、素材、5 项指标、数据来源、最近拉数和操作。
5. 帖子详情页通过：首屏展示标题、发布状态、主题、最终稿正文、标签、发布素材、发送结果、`platformPostId`、metrics 快照、数据来源和 OpenClaw 发送记录。
6. 真实发布链路通过：`post_9100f36d13` 保持 `status=published`，`platformPostId=6a026a40000000003600289d`。
7. `source` 展示通过：数据来源为 `xhs_creator_center`。
8. 图片和素材数据层通过：`asset.url=/api/assets/asset_3876dcbec3/content`，外网访问返回 `200 image/png`，大小约 1.8MB。

当前已知问题：

1. `refresh-metrics` 当前返回 `422`，同步错误为 `page_structure_changed`。
2. 该问题与本轮前端 UI 改版无关，归属 OpenClaw metrics DOM 解析修复。
3. 帖子详情页仍可能因 SSR 缓存显示旧的“素材加载失败”文本，但 API 已返回正确素材 URL。
4. 构建过程提示未安装 ESLint，Next build 已完成编译、类型检查、页面生成和构建产物输出。

## 后续验收清单

1. OpenClaw 修复 `page_structure_changed` 后，重新验证 `refresh-metrics`。
2. 清理或刷新前端 SSR 缓存后，确认帖子详情页不再显示旧的“素材加载失败”文本。
3. 验证真实发布按钮不会对已发布帖子二次触发。
4. 验证无真实 `platformPostId` 时不会展示为已发布。
5. 视频发布进入第二阶段前，继续返回防御性错误码。
