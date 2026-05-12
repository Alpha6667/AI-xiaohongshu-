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

## 后续验收清单

1. UI 信息架构改版后，重新浏览首页、消息任务中心、多账号运营、发布中心、帖子详情页。
2. 验证真实发布按钮不会对已发布帖子二次触发。
3. 验证无真实 `platformPostId` 时不会展示为已发布。
4. 验证素材展示、metrics 展示和刷新指标功能保持可用。
5. 视频发布进入第二阶段前，继续返回防御性错误码。
