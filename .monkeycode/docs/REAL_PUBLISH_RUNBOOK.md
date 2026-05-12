# 小红书真实发布 Runbook

## 目标

本文档用于约束小红书真实发布流程，避免重复发布、伪造发布状态、登录态误操作和恢复流程失控。

## 发布前检查

真实发布前必须完成以下检查：

1. 确认用户已明确授权本次真实发布。
2. 确认当天真实发布数量在安全范围内，默认一天最多 2 条。
3. 确认目标 `postId` 当前状态允许发布。
4. 确认目标 `postId` 没有真实 `platformPostId`。
5. 确认目标 `postId` 没有处于 `publishing` 状态。
6. 确认文案 `finalBody`、标题、tags 和素材符合预期。
7. 确认 OpenClaw `/health` 返回 `realPublish=true`。
8. 确认后端已配置 `OPENCLAW_PUBLISH_WEBHOOK_URL`。

## 强制约束

1. 没有真实小红书 noteId 时，后端不能把帖子标记为 `published`。
2. 禁止写入 `xh_realtime_`、`mock_`、`fake_`、`test_` 等模拟 `platformPostId`。
3. 同一 `postId` 在 `publishing` 状态时禁止再次触发发布。
4. 发布失败或超时后，必须先检查创作者中心是否已经出现该帖子。
5. `submit_clicked=true` 后出现失败或超时，禁止自动二次点击发布。
6. 生产 `repository.json` 必须通过后端 service/repository 流程更新。
7. 禁止手工回写 `platformPostId` 或手工写 `metrics-snapshots`。
8. 禁止提交或输出 `.env`、token、Cookies、Chrome profile、截图、账号密码。

## OpenClaw 发布状态

OpenClaw 应维护发布状态文件和发布锁：

1. 发布状态目录：`/root/.openclaw/publish-state/`
2. 发布锁目录：`/root/.openclaw/publish-locks/`
3. 每个 `postId` 同一时间只能有一个发布流程。
4. 进程异常退出后，必须通过状态文件判断是否已点击发布。
5. zombie lock 只能在确认进程不存在且状态安全后清理。

## 发布成功标准

一次真实发布只有在满足以下条件时才算成功：

1. OpenClaw 返回真实小红书 noteId。
2. 后端保存 `platformPostId` 为该真实 noteId。
3. 帖子状态为 `published`。
4. 创作者中心可以找到对应帖子。
5. `refresh-metrics` 可以返回 `source=xhs_creator_center`。

## 发布失败处理

发布失败后按以下顺序处理：

1. 查看 OpenClaw 状态文件，确认是否已点击提交按钮。
2. 查看创作者中心，确认是否已经发布成功。
3. 如果创作者中心已出现帖子，必须提取真实 noteId 并按正式流程恢复。
4. 如果创作者中心没有出现帖子，才可以恢复为 `approved + platformPostId=null`。
5. 恢复必须通过后端 repository/service 方法执行。
6. 恢复后重新发布需要用户再次明确授权。

## Metrics 约定

真实 metrics 的 `source` 必须为：

```text
xhs_creator_center
```

允许的 metrics 错误码：

```text
login_required
post_not_found
page_structure_changed
metrics_unavailable
metrics_fetch_timeout
metrics_fetch_execution_error
```

OpenClaw 从创作者中心读取指标时字段顺序固定为：

```text
views = nums[0]
comments = nums[1]
likes = nums[2]
favorites = nums[3]
followConversions = nums[4]
```

## 媒体发布约定

后端传给 OpenClaw 的素材 payload 应保留原始本地路径，供 Playwright 上传文件使用。

前端展示素材时必须使用后端代理 URL：

```text
/api/assets/{assetId}/content
```

发布/媒体错误码：

```text
unsupported_media_type
unsupported_mixed_media
media_download_failed
media_upload_failed
video_upload_timeout
video_processing_timeout
publish_execution_error
```

当前阶段视频真实发布保持防御性拒绝，第二阶段再实现视频上传、处理、封面和真实验收。
