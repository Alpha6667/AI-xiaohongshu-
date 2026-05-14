# OpenClaw 运行时知识手册

> 本文档供接手后的 OpenClaw 模型理解当前系统的运行时约定、脚本入口、规范约束和排查路径。
> 编写时间：2026-05-14

---

## 一、发布脚本入口

### 1.1 xhs_publish.js

**路径**：`/root/.openclaw/workspace/skills/xiaohongshu-publisher/xhs_publish.js`

**当前版本 commit**：`2c0ddda`（已回滚，无反检测参数）

**工作流程**：
1. 用 `playwright.launchPersistentContext(profileDir, { headless: true })` 启动浏览器
2. 预热 session：打开 `creator.xiaohongshu.com/new/home`
3. 进入发布页：`creator.xiaohongshu.com/publish/publish`
4. 切换到"上传图文" tab
5. 上传图片（`input[type="file"]` → `setInputFiles`）
6. 填写标题（用 `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set` 赋值）
7. 填写正文（contenteditable div → `innerHTML` 赋值）
8. 点击发布按钮（`page.evaluate` 内 `button.click()`）
9. 监听网络响应 `page.on('response')` 匹配 `/web_api/sns/v2/note` 提取 noteId

**已知缺陷**：
- 发布按钮点击触发方式单一（只有 `evaluate` 内 `click()`）
- 部分小红书版本或账号在 headless 模式下点击会被 JS 层拦截
- noteId 监听路径只匹配 `/web_api/sns/v2/note`，如果 API 路径变更会漏捕获

**改进方向**：
- 按钮点击添加多种 fallback（`page.click` → `evaluate click` → `mouse.click`）
- noteId 监听扩展至更多 API URL 模式
- 发布后等待时间从 5s 加到 15s+

### 1.2 xhs_metrics.js

**路径**：`/root/.openclaw/workspace/skills/xiaohongshu-publisher/xhs_metrics.js`

**当前版本 commit**：`54b6ec8`

**工作流程**：
1. 用 `playwright.launchPersistentContext(profileDir, { headless: true })` 启动浏览器
2. 进入创作者中心笔记管理页：`creator.xiaohongshu.com/new/home` → `/new/note-manager`
3. 搜索目标帖子（通过 platformPostId 或标题）
4. 提取 DOM 中 5 个指标数字

**DOM 字段映射（2026-05-13 已验证）**：
| 索引 | 指标 | 说明 |
|------|------|------|
| nums[0] | views | 浏览 |
| nums[1] | comments | 评论 |
| nums[2] | likes | 点赞 |
| nums[3] | favorites | 收藏 |
| nums[4] | followConversions | 分享（暂存于此字段） |

**特殊处理**：
- 分享数据（nums[4]）暂存到 `followConversions` 字段，因后端 schema 没有独立 `shares` 字段
- 两种匹配模式：`precision_match`（精确匹配）和 `first_card`（列表页第一张卡片兜底）

---

## 二、profilePath 规则

### 2.1 目录命名

```
/root/.openclaw/xhs-profile-persist-{accountId}
```

| accountId | Profile 路径 |
|-----------|-------------|
| `account_aeziyo` | `/root/.openclaw/xhs-profile-persist-account_aeziyo` |
| `account_877059946` | `/root/.openclaw/xhs-profile-persist-account_877059946` |

### 2.2 动态设置

`server.js` 中 `getProfileDir()` 函数：

```javascript
function getProfileDir(task) {
  return task.account?.profilePath || task.account?.profileDir || DEFAULT_PROFILE_DIR;
}
```

优先级：
1. `task.account.profilePath`（来自后端 API）
2. `task.account.profileDir`（兼容旧字段）
3. `DEFAULT_PROFILE_DIR`（硬编码默认值）

环境变量：`XHS_PROFILE_DIR` 传递给子进程。

### 2.3 硬性约束

- 不同账号的 profile **不能共用**
- 禁止删除、移动、打包上传到 Git
- profile 内容（Cookie/token/session）禁止输出到任何结果
- 检查登录态时只允许检查 Cookie 名称存在性，禁止输出值

---

## 三、publish-state 和 publish-lock 规则

### 3.1 目录结构

```
/root/.openclaw/
├── publish-state/
│   └── {postId}.json    # 状态文件
└── publish-locks/
    └── {postId}.lock    # 发布锁
```

### 3.2 状态文件 {postId}.json

**安全设计**：
- 不保存 token、Cookie、Chrome profile
- 不保存完整正文（只存 `finalBodyHash: SHA256`）
- 素材只存 hash 列表（`assetHashes: [SHA256]`）

**状态流转**：
```
idle → preparing → publishing → submit_clicked → callback_pending → completed/failed
```

**关键字段**：
- `submitClicked: boolean` — **一旦 true 禁止再次点击发布按钮**
- `platformPostId: string|null` — 发布成功后小红书返回的 noteId

### 3.3 Lock 文件 {postId}.lock

- 同 postId 存在有效 lock 时拒绝再次发布
- lock 超过 30 分钟且对应 pid 不存在 → 僵尸 lock，自动清理
- 发布完成/失败时释放 lock

### 3.4 防护场景

| 场景 | 防护机制 |
|------|---------|
| 同 postId 二次提交 | `submitClicked=true` + lock 双重拦截 |
| Callback 失败 | 状态设为 `callback_pending`，只允许补 callback 禁止重发 |
| 僵尸 lock | 30 分钟超时自动清理 |
| Mock 模式 | 不创建任何持久化状态文件 |

---

## 四、小红书 captcha / 人工验证处理

### 4.1 检测方式

在 metrics 抓取和发布过程中检测以下位置：
- 预热页 URL 是否跳转到 captcha 页
- note-manager 页面是否显示人工验证
- 卡片详情页是否提示验证

### 4.2 返回格式

```json
{
  "success": false,
  "error": "Xiaohongshu requires manual human verification...",
  "errorCode": "post_needs_manual_verification",
  "source": "xhs_creator_center"
}
```

### 4.3 处理规则

- ❌ **禁止**自动绕过 captcha、人机验证或平台风控
- ❌ **禁止**使用反检测参数、自定义 UA 绕过验证
- ❌ **禁止**自动重试
- ✅ 检测到 captcha 后立即停止所有操作
- ✅ 返回 `post_needs_manual_verification` 错误码
- ✅ 提示用户在官方页面完成人工验证后再重试

### 4.4 后端保存

- `post_needs_manual_verification` 已加入 errorCode allowlist
- 不会被归一化成 `metrics_fetch_execution_error`
- 后端保存 `lastSyncStatus=failed` + `syncError=post_needs_manual_verification`

---

## 五、规范约束

### 5.1 source 字段（仅允许值）

```
xhs_creator_center     ✅ 唯一允许值
xhscreatorcenter       ❌ 禁用
xhs_creator            ❌ 禁用
mock                   ❌ 禁用
```

### 5.2 errorCode 允许列表

```
login_required
post_not_found
page_structure_changed
metrics_unavailable
metrics_fetch_timeout
metrics_fetch_execution_error
post_needs_manual_verification
```

### 5.3 platformPostId 规则

- **禁止**伪造 `platformPostId`（禁止 `xh_` 前缀的 fallback ID）
- 必须由真实发布回调写入
- 没有真实 `platformPostId` 禁止标记为 `published`

### 5.4 发布频率约束

- 一天默认只发 1 条，最多 2 条（低风控模式）
- 发帖前必须先预热 session
- 禁止冷启动后秒发

### 5.5 安全红线

- 禁止输出 Cookie/token/session/profile 内容
- 禁止删除/移动 profile 目录
- 禁止提交 `.env` 到 Git
- 禁止提交 `repository.json` 到公共仓库（如有敏感内容）
- 禁止在日志/输出中暴露 API key

---

## 六、真实发布前检查清单

每次真实发布前执行：

```bash
# 1. 检查 Publisher 健康状态
curl http://127.0.0.1:18790/health
# 确认 realPublish=true

# 2. 检查登录态
# 用 Playwright 打开 creator.xiaohongshu.com/new/home
# 确认不跳转登录页

# 3. 检查 post 状态
curl http://127.0.0.1:8000/api/posts/{postId}
# status=approved, platformPostId=null

# 4. 确认无重复发布
ls /root/.openclaw/publish-locks/{postId}.lock 2>/dev/null
# 不应存在

# 5. 确认图片文件可访问
file /root/.openclaw/media/test_upload_img.png
# 避免使用可疑格式/分辨率的图片
```

---

## 七、常见故障排查

### 7.1 发布按钮点击无响应

```
Publish click: clicked
（无 CAPTURED NOTE ID）
URL 未跳转
```

**可能原因**：
1. 图片文件有问题（被小红书拦截）→ **换图重试**
2. headless 检测 → 用 Xvfb headed 模式
3. 账号新注册，风控等级更高 → 用账号1试试

**排查**：监听网络请求，看点击后是否有 `note/post` API 请求发出

### 7.2 Publisher realPublish=false

```
/health 返回 realPublish: false
```

**修复**：重启 publisher，确保传递 `USE_REAL_PUBLISH=true` 环境变量

### 7.3 前端显示"暂无数据"

**原因**：metrics snapshot 的 `source` 字段缺失或为 null

**修复**：在 server.js 中确保 mock 和真实路径都返回 `source: "xhs_creator_center"`

### 7.4 后端启动报 AccountStatus 枚举错误

**原因**：`repository.json` 中 `accounts.*.status` 值不在枚举中

**允许值**：`online`, `offline`, `error`, `connecting`, `disconnected`

### 7.5 素材不显示

**原因**：asset 记录的 `url` 字段用了 `/api/assets/{id}/content`，而非本地绝对路径

**修复**：将 `url` 改为 `/root/.openclaw/media/asset_{hash}.{ext}` 格式

### 7.6 OOM / 内存不足

**症状**：curl 被 kill、Python 后端被 kill、publisher 子进程被 kill

**处理**：
- `pkill -f chrome-headless-shell` 清理僵尸进程
- 限制并发数（一次只跑一个 playwright 进程）
- 建议升级到至少 4GB 内存

### 7.7 创作者中心跳 captcha

**处理**：
1. 停止所有真实发布和 metrics 抓取
2. 用户手动打开 `creator.xiaohongshu.com/new/home` 完成验证
3. 验证通过后恢复

---

## 八、关键文件参考

| 文件 | 用途 |
|------|------|
| `/root/.openclaw/workspace/skills/xiaohongshu-publisher/server.js` | Webhook 调度入口 |
| `/root/.openclaw/workspace/skills/xiaohongshu-publisher/xhs_publish.js` | 发布执行器 |
| `/root/.openclaw/workspace/skills/xiaohongshu-publisher/xhs_metrics.js` | Metrics 抓取执行器 |
| `/srv/AI-xiaohongshu-/backend/data/repository.json` | 后端数据库 |
| `/root/.openclaw/openclaw.json` | OpenClaw 主配置 |
| `/srv/qq-forward-service/forward.sh` | QQ 消息转发 |
| `/root/.openclaw/publish-state/` | 发布状态文件 |
| `/root/.openclaw/publish-locks/` | 发布锁文件 |

---

## 九、快捷命令参考

```bash
# Publisher 健康
curl http://127.0.0.1:18790/health

# Publisher 日志
tail -f /tmp/publisher_real.log

# 后端 API 示例
curl http://127.0.0.1:8000/api/posts/{postId}
curl -X POST http://127.0.0.1:8000/api/posts/{postId}/refresh-metrics

# OpenClaw 状态
openclaw status

# 清理 Chrome 僵尸进程
pkill -f chrome-headless-shell

# 清理发布锁
rm /root/.openclaw/publish-locks/{postId}.lock
```

---

_编写：OpenClaw (沛虾 🦞)_
_日期：2026-05-14_
