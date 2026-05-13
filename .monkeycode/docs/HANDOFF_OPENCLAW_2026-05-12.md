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

---

## OpenClaw 制作过程中遇到的问题

### 1. 发布流程 finalBody 拼接错误

**问题描述：**
`xhs_publish.js` 中传入的 `body` 字段与 `finalBody` 变量不一致，导致发布脚本在内容区域填写了错误的文本（body 字段名为 `finalBody` 但实际发送时变量不匹配）。

**解决方案：**
修复 `xhs_publish.js` 中的变量传递，统一使用 `body` 作为输入字段名，并在脚本内拼接 `#英雄联盟 #佛耶戈` 格式的话题标签。

**相关提交：**
```text
47479b5 fix: append tags to xhs publish body
```

### 2. Metrics 指标字段映射错误

**问题描述：**
创作者中心卡片列表中，DOM 图标顺序为 `浏览 → 评论 → 点赞 → 收藏 → 转发`，但原代码错误地映射为 `views, comments, favorites, likes, followConversions`，导致 `likes` 和 `favorites` 互相调换。

**解决方案：**
通过 5 次独立执行 SVG path 特征分析，确认每个图标的特征路径，最终确定正确的映射：
```javascript
views = nums[0], comments = nums[1], likes = nums[2],
favorites = nums[3], followConversions = nums[4]
```

**相关提交：**
```text
a8e8fab fix: correct metrics field mapping (likes vs favorites)
```

**2026-05-13 最新复核：**

用户通过小红书 APP 和创作者中心图标再次确认，当前 note-manager 卡片底部 5 个数字应按图标语义映射，不能丢弃第 5 项分享数据：

```javascript
views = nums[0]
comments = nums[1]
likes = nums[2]
favorites = nums[3]
followConversions = nums[4]
```

`followConversions` 当前承载小红书分享/转发箭头图标的数字。后续若后端和前端新增 `shares` 字段，可以从该字段迁移；在 schema 未调整前必须继续保留该值，不能写成 `0` 或丢弃。

真实校验样例 `post_9100f36d13` 的人工确认基准：

```text
nums[0] = 浏览 = 10
nums[1] = 评论 = 0
nums[2] = 点赞 = 2
nums[3] = 收藏 = 1
nums[4] = 分享 = 1
APP 显示“赞和收藏 3” = 点赞 2 + 收藏 1
```

真实后台截图同时确认第二张卡片 `枯木逢春` 的顺序一致：浏览 14、评论 3、点赞 3、收藏 2、分享 2。

OpenClaw 已提交最终修复：

```text
2763de5
54b6ec8
```

生产验证结果：

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

`54b6ec8` 保持 `server.js` 对外返回 `followConversions`，用于兼容后端现有 schema；该字段当前承载分享数。

下一次修改 `openclaw/xhs_metrics.js` 时，必须同时检查 precision match 和 first_card fallback 两处映射，保持同一顺序。

### 3. 笔记匹配无法按 data-id 精准定位

**问题描述：**
创作者中心 note-manager 列表页的卡片 DOM 结构不暴露 `data-id` 或类似与 `noteId` 一致的属性，无法直接从列表层匹配到目标帖子。

**解决方案：**
改为逐个点击卡片进入详情页，从 URL `id=XXX` 中提取真实 `noteId`，按 `platformPostId` 精确匹配。匹配成功后使用列表层预抓取的 `nums` 数据。无匹配时 fallback 到 `first_card`（带 warning）。

**相关提交：**
```text
bf4b680 fix: precision matching via card detail URL
```

### 4. 浏览器 context 冲突导致 metrics 脚本偶发失败

**问题描述：**
OpenClaw server 侧在接收 metrics webhook 时，Playwright 浏览器 context 存在竞态问题，偶尔报错 `Target page, context or browser has been closed`。

**解决方案：**
在 `server.js` 中增加 retry 机制，metrics 脚本调用失败后自动重试一次，避免偶发 context 冲突导致整个请求失败。

**相关提交：**
```text
3bb083d fix: add retry to metrics webhook handler
```

### 5. 页面跳转 captcha 时错误码误判

**问题描述：**
metrics 脚本在创作者中心 note-manager 页面被小红书跳转到 `web-login/captcha` 验证页时，DOM 中无卡片元素，原代码返回 `page_structure_changed`，误导排查方向。

**解决方案：**
在预热页（new/home）、note-manager 入口、卡片详情页、返回列表后共 4 个检测点添加 captcha/login 重定向检测。检测到 captcha 时：
- 立即停止 metrics 抓取
- 返回错误码 `post_needs_manual_verification`
- 错误信息明确提示"在官方浏览器页面完成人工验证后再重试"
- 不重试、不绕过、不继续请求

**相关提交：**
```text
ed73c8c fix: accurate captcha detection for metrics without bypass attempts
```

### 6. 登录态 Cookie 存在但仍跳 captcha

**问题描述：**
`access-token` 和 `a1` Cookie 都存在（17 个 Cookie），但访问 `creator.xiaohongshu.com/new/home` 仍然跳转到 captcha 页。原因是小红书风控策略与 headless Chromium 请求特征相关，而非登录态过期。

**解决方案：**
- 确认此问题不属于代码修复范围
- 用户通过官方浏览器完成一次手动验证后恢复正常
- OpenClaw 只负责检测并安全失败，不尝试绕过

## 关键文件清单

```text
openclaw/server.js              — webhook 入口，retry 逻辑
openclaw/xhs_publish.js          — 真实发布浏览器自动化
openclaw/xhs_metrics.js          — 真实 metrics 浏览器自动化 + captcha 检测
openclaw/publisher/publish_state.js   — 发布状态持久化
openclaw/publisher/publish_lock.js     — 发布锁
openclaw/publisher/xhs_preflight.js   — 发布前检查
openclaw/SKILL.md               — OpenClaw skill 定义
```

## 测试命令

```bash
# 单独测试 metrics 抓取
NODE_PATH=$NODE_PATH \
XHS_PROFILE_DIR=/root/.openclaw/xhs-profile-persist \
XHS_HEADLESS=true \
XHS_METRICS_TIMEOUT_MS=120000 \
timeout 120 node /srv/AI-xiaohongshu-/openclaw/xhs_metrics.js "<platformPostId>"

# 单独测试发布（需要 post 已 approved）
# 由后端 POST /api/posts/{postId}/publish 触发

# 检查 OpenClaw health
curl http://127.0.0.1:18790/health

# 检查发布状态
cat /root/.openclaw/publish-state/<postId>.json

# 检查发布锁
cat /root/.openclaw/publish-locks/<postId>.lock

# 持久化测试
cd /srv/AI-xiaohongshu-/backend
python3 -m pytest tests/test_publish_persistence.py -v
```

## 后续注意事项

1. **Git context 冲突**：服务器内存不足 4GB 时，多次 Playwright 启动可能导致 OOM。如果 metrics 报 `metrics_fetch_execution_error` 且日志中有 `browserType.launchPersistentContext` 相关错误，优先检查内存。
2. **captcha 恢复**：用户手动验证后要再等 30-60 秒让 session 稳定，再执行 refresh-metrics。
3. **Mock 模式**：`USE_REAL_PUBLISH=false` 时不创建持久化状态，不影响真实链路。
4. **发布锁清理**：异常后手动清理 lock：
   ```bash
   rm /root/.openclaw/publish-locks/<postId>.lock
   ```
   health check 也会自动清理超过 30 分钟的僵尸锁。
5. **视频发布**：当前处于第二阶段规划，不要提前实现。视频素材上传会返回 `unsupported_media_type` 或 `unsupported_mixed_media`。
6. **日志安全**：不要在日志或回复中输出 Cookie 值、token 值或 Chrome profile 内容。只检查存在性，不输出真实值。
