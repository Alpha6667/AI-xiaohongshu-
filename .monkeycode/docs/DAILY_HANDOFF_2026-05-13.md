# 2026-05-13 日终交接记录

## 今日主线

今天围绕小红书真实发布后的数据准确性、多账号登录态、前端指标展示和任务页可用性完成收口。

## OpenClaw 工作记录

### Metrics DOM 映射修复

确认小红书创作者中心 note-manager 卡片底部 5 个图标顺序为：

```text
浏览 -> 评论 -> 点赞 -> 收藏 -> 分享
```

最终映射：

```text
views = nums[0]
comments = nums[1]
likes = nums[2]
favorites = nums[3]
followConversions = nums[4]
```

关键结论：

1. `a1e41fb` 的映射方向错误，评论和收藏曾被搞反，分享也存在被丢弃风险。
2. 分享数据必须保留，当前继续用 `followConversions` 承载，兼容后端现有 schema。
3. 后续可新增 `shares` 字段做产品化迁移，迁移前继续保留 `followConversions`。

相关 OpenClaw 提交：

```text
2763de5
54b6ec8
```

生产真实抓取验证：

```text
验证时间：2026-05-13 22:20 CST
postId：post_9100f36d13
platformPostId：6a026a40000000003600289d
DOM nums：[10, 0, 2, 1, 1]
views = 10
comments = 0
likes = 2
favorites = 1
followConversions = 1
source = xhs_creator_center
matchedBy = first_card
```

真实后台截图同时确认第二张卡片 `枯木逢春` 顺序一致：

```text
浏览 14
评论 3
点赞 3
收藏 2
分享 2
```

### 多账号登录态发现

账号 `account_877059946` 当前只是手动录入的小红书名称和 ID，没有真实登录态。其 profile 目录：

```text
/root/.openclaw/xhs-profile-persist-account_877059946
```

当前问题：

1. 使用账号2真实发布时会打开小红书登录页。
2. 需要先让该账号完成扫码登录，形成独立 Chrome profile。
3. 不能复制 `account_aeziyo` 的 profile 给账号2。

短期处理方案：

```text
OpenClaw 使用账号2专属 profilePath 启动 persistent context。
打开小红书创作者中心登录页。
点击右上角扫码登录切换入口。
截图二维码给用户扫码。
扫码成功后验证 creator.xiaohongshu.com/new/home 可访问。
再将 account_877059946 标记为 connected。
```

点击扫码入口策略：优先文本/role/DOM selector，最后使用登录卡片右上角相对坐标兜底。

## 后端工作记录

### Metrics 保存验收

生产后端保存验收通过：

```text
验收时间：2026-05-13 22:29 CST
BACKEND_METRICS_ACCEPTANCE=PASS
POST /api/posts/post_9100f36d13/refresh-metrics = 201
OpenClaw commit = 54b6ec8
Publisher mode during refresh = USE_REAL_PUBLISH=true
repository snapshots count = 161
```

后端返回刷新结果：

```json
{
  "id": "metric_8043d5a198",
  "snapshotAt": "2026-05-13T14:29:33.040957+00:00",
  "views": 10,
  "likes": 2,
  "favorites": 1,
  "comments": 0,
  "followConversions": 1,
  "source": "xhs_creator_center"
}
```

repository 最新持久化 snapshot：

```json
{
  "id": "metric_03ae0702cc",
  "postId": "post_9100f36d13",
  "snapshotAt": "2026-05-13T14:29:54.914295+00:00",
  "views": 10,
  "likes": 2,
  "favorites": 1,
  "comments": 0,
  "followConversions": 1,
  "source": "xhs_creator_center"
}
```

结论：后端 `refresh-metrics`、内存模型更新和 `repository.json` 持久化均通过。

## 前端工作记录

### 帖子详情 metrics 展示优化

已提交：

```text
18fe97a feat: refine post metrics refresh and display
```

改动：

1. 自动刷新间隔从 60 秒改为 3 小时。
2. 保留手动刷新按钮。
3. 帖子详情 metrics 区改为两行三列统计卡样式。
4. 展示浏览量、评论数、收藏数、点赞数、分享数、同步状态。
5. 数据来源、最近抓取时间和同步错误保留在指标卡下方。

构建结果：`npm run build` 通过，仅保留既有 `<img>` LCP warning。

### /tasks 页面看板恢复

已提交并推送：

```text
aa03b8f fix: restore tasks board layout
```

改动：

1. 页面标题改为“消息任务中心 / 发帖任务看板”。
2. 保留顶部统计：全部任务、待确认、已生成、涉及账号。
3. 将任务列表恢复为独立卡片结构。
4. 每张卡片展示发布账号、任务主题、当前阶段、内容准备度、文案状态、图片状态、人工确认状态、消息时间、计划时间和下一步动作。
5. “去内容确认台”和“查看帖子详情”改为明确按钮样式。
6. 移动端改为单列，避免横向溢出。

构建结果：`pnpm --dir frontend build` 通过。

## 当前运行状态

1. `post_9100f36d13` metrics 真实数据正确。
2. Publisher 需要保持 `USE_REAL_PUBLISH=true`，避免 mock metrics 覆盖真实数据。
3. `/tasks` 修复已推送，但需要真实服务器拉取 `aa03b8f` 后重新 build 并重启前端服务。
4. 账号2真实发布前必须先完成专属 profile 扫码登录。

## 后续任务

### OpenClaw

1. 为 `account_877059946` 创建/使用专属 profile。
2. 实现或临时执行扫码登录流程。
3. 登录成功后验证创作者中心可访问。
4. 再继续发布 `post_c99f744268`。

### 后端

1. 规划正式登录接口：`POST /api/accounts/{accountId}/login/start`。
2. 规划登录状态接口：`GET /api/accounts/{accountId}/login/status`。
3. 登录成功后写入 `connectionStatus=connected`、`profilePath`、`lastValidatedAt`。

### 前端

1. 部署并验收 `aa03b8f` 的 `/tasks` 页面修复。
2. 后续在 `/accounts/manage` 增加“登录小红书”入口。
3. 展示扫码登录二维码、登录状态和过期重试入口。

## 部署指令

部署 `/tasks` 修复：

```bash
cd /srv/AI-xiaohongshu-
git fetch origin
git checkout 260509-chore-add-final-archive
git pull --ff-only origin 260509-chore-add-final-archive

cd frontend
pnpm build
```

验收页面：

```text
http://43.138.143.39/tasks
http://43.138.143.39/posts/post_9100f36d13
```
