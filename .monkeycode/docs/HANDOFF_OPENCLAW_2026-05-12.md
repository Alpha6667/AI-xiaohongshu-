# 2026-05-12 OpenClaw 交接文档

## 当前状态

OpenClaw 已经完成真实小红书图文发布、真实 metrics 抓取、发布状态持久化、防重复发布、登录态保护和 captcha / 人工验证安全识别。

## 关键提交

```text
77406f2 feat: persist openclaw publish executions
ed73c8c fix: accurate captcha detection for metrics without bypass attempts
```

## 主要能力

1. 使用 `/root/.openclaw/xhs-profile-persist` 中的真实登录态访问小红书创作者中心。
2. 通过 `POST /api/openclaw/publish` 执行真实图文发布。
3. 通过 `POST /api/openclaw/metrics` 抓取真实 metrics。
4. 使用 publish state 和 publish lock 防止重复发布。
5. 发布成功后返回真实小红书 noteId。
6. 抓取 metrics 时返回 `source=xhs_creator_center`。
7. 发现 captcha / 人工验证页时返回 `post_needs_manual_verification` 并立即停止。

## 关键文件

```text
openclaw/server.js
openclaw/xhs_publish.js
openclaw/xhs_metrics.js
openclaw/SKILL.md
openclaw/publisher/publish_state.js
openclaw/publisher/publish_lock.js
openclaw/publisher/xhs_preflight.js
```

## 登录态目录

```text
/root/.openclaw/xhs-profile-persist
```

硬性规则：

1. 禁止删除。
2. 禁止移动。
3. 禁止复制到 Git 或聊天附件。
4. 禁止输出 Cookie/token/profile 内容。
5. 只能检查是否存在，不能输出真实值。

## 发布状态目录

```text
/root/.openclaw/publish-state/
/root/.openclaw/publish-locks/
```

状态设计约束：

1. 不保存 token、Cookie、Chrome profile、账号密码。
2. 不保存完整正文，只保存 hash。
3. `submitClicked=true` 后禁止再次点击发布。
4. callback 失败且已有 `platformPostId` 时，只允许补 callback，不允许重发。
5. mock 模式不创建状态文件。

## Metrics 字段映射

创作者中心列表指标顺序：

```text
views = nums[0]
comments = nums[1]
likes = nums[2]
favorites = nums[3]
followConversions = nums[4]
```

## 人工验证错误

当页面跳转到 captcha / verify / login 相关页面时，返回：

```json
{
  "success": false,
  "errorCode": "post_needs_manual_verification",
  "source": "xhs_creator_center"
}
```

安全边界：

1. 只允许检测并安全停止。
2. 禁止绕过 captcha、人机验证或平台风控。
3. 禁止使用反检测参数、自定义 UA 或自动化通过验证的流程。
4. 等用户在官方页面完成人工验证后再重试。

## 已通过验收

真实发布：

```text
postId = post_9100f36d13
platformPostId = 6a026a40000000003600289d
```

人工验证后 metrics 恢复：

```text
lastSyncStatus = succeeded
syncError = null
source = xhs_creator_center
metricsHistory: 3 -> 4
views: 1 -> 3
```

## 当前注意事项

1. 当前视频真实发布仍未实现，视频素材保持防御性拒绝。
2. 服务器内存较低时，Playwright/Chromium 容易不稳定，建议预留 swap 或升级到至少 4GB 内存。
3. 遇到 captcha 时停止自动化，等待用户手动处理。
4. 不要在日志或回复中输出敏感值。

## 下一步 OpenClaw 优化建议

1. 增加 metrics 抓取前的轻量健康检查，提前识别人工验证状态。
2. 增加更明确的执行日志摘要，方便前后端显示失败原因。
3. 建立发布和 metrics 的最小命令行自测入口。
4. 第二阶段再规划视频发布、封面、转码和超时处理。
