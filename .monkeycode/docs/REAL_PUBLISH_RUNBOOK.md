# REAL_PUBLISH_RUNBOOK.md — 真实发布 Runbook

## 概述

本文档记录了 OpenClaw 小红书真实发布流程的持久化机制。服务端通过 lock 文件、state 文件和 preflight 检查来确保发布行为的幂等性和可追溯性。

## 持久化架构

```
/root/.openclaw/
├── publish-state/        # 发布状态文件
│   └── {postId}.json    # 每次真实发布创建
└── publish-locks/        # 发布 lock 文件
    └── {postId}.lock    # 发布期间锁
```

### 状态文件 `publish-state/{postId}.json`

**安全设计：**
- ❌ 不保存 token、Cookie、Chrome profile、账号密码
- 不记录完整正文（只存 `finalBodyHash: SHA256`）
- 素材只存 hash 列表（`assetHashes: [SHA256]`）

**字段说明：**

```json
{
  "postId": "post_xxx",
  "title": "标题",
  "finalBodyHash": "sha256hex",        // 发送给 XHS 的正文的 SHA256
  "assetHashes": ["sha256hex", ...],    // 素材 URL 的 SHA256
  "tags": ["标签1", "标签2"],
  "status": "idle|preparing|publishing|submit_clicked|callback_pending|completed|failed",
  "attempt": 1,
  "submitClicked": false,               // 一旦 true，禁止自动再次点击发布
  "platformPostId": null,               // 发布成功后 XHS 返回的 note_id
  "startedAt": "ISO8601",
  "updatedAt": "ISO8601",
  "events": [
    {"event": "created", "timestamp": "ISO8601", "detail": "..."},
    {"event": "preflight_passed", ...},
    {"event": "lock_acquired", ...},
    {"event": "browser_started", ...},
    {"event": "asset_uploaded", ...},
    {"event": "content_filled", ...},
    {"event": "submit_clicked", ...},
    {"event": "platform_id_detected", ...},
    {"event": "callback_sent", ...},
    {"event": "callback_confirmed", ...},
    {"event": "metrics_refreshed", ...},
    {"event": "completed", ...},
    {"event": "failed", ...},
    {"event": "unknown", ...}
  ],
  "lastError": null
}
```

### Lock 文件 `publish-locks/{postId}.lock`

```json
{
  "postId": "post_xxx",
  "startedAt": "ISO8601",
  "pid": 12345
}
```

**机制：**
- 每次真实发布前为 postId 创建 lock
- 同 postId 存在有效 lock 时拒绝再次发布
- 发布完成/失败时释放 lock
- 超过 30 分钟且对应 pid 不存在 → 认为是僵尸 lock，自动清理

## 发布流程

```
received → preflight → createState → acquireLock → browser → result → writeback → releaseLock
```

### Step-by-step

1. **Preflight 检查** (`xhs_preflight.js::preflightCheck`)
   - 检查 `submitClicked`：true 则拒绝（防止重复点击发布按钮）
   - 检查已有状态是否 `completed`：拒绝
   - 检查已有状态是否 `callback_pending`：拒绝，返回 platformPostId 提示补 callback

2. **初始化状态** (`xhs_preflight.js::initPublishState`)
   - 调用 `createState()` 创建 `publish-state/{postId}.json`
   - 计算 `finalBodyHash`（SHA256）
   - 计算 `assetHashes`（每个 asset URL 的 SHA256）
   - 状态设为 `preparing`

3. **获取 Lock** (`publish_lock.js::acquireLock`)
   - 创建 `publish-locks/{postId}.lock`
   - 如果已存在则检测僵尸 lock
   - 成功后状态设为 `publishing`，添加事件 `lock_acquired`

4. **浏览器发布** (`xhs_publish.js`)
   - 记录 `browser_started` 事件
   - 发布完成后：
     - 成功：记录 `submit_clicked`、`platform_id_detected`，标记 `completed`
     - 失败：标记 `failed`

5. **Callback 回写**
   - 成功后调用 `writebackResult` 通知 backend
   - Writeback 成功：记录 `callback_sent` + `callback_confirmed`
   - Writeback 失败且有 platformPostId：状态设为 `callback_pending`
     - ⚠️ 此时只允许补 callback，不允许重发

6. **释放 Lock**（无论成功/失败，`finally` 块执行）
   - 记录事件并删除 lock 文件

## 状态流转图

```
idle
  ↓ preflight passed
preparing
  ↓ lock acquired
publishing
  ↓ submit button clicked
submit_clicked
  ↓ platformPostId detected
submit_clicked (platformPostId set)
  ↓
  ├─ writeback success → completed (callback_confirmed)
  ├─ writeback fail → callback_pending (保留 platformPostId)
  └─ error during browser → failed
```

## 防护场景

### 场景 1：同 postId 二次提交
- Preflight 检测 `submitClicked=true` → 返回 `rejected`
- Lock 检测 `publish-locks/{postId}.lock` 存在 → 返回 `rejected`
- ✅ 双重防护

### 场景 2：Callback 失败
- 状态自动设为 `callback_pending`
- `platformPostId` 已保存
- 下次 preflight 检测到 `callback_pending` → 拒绝重发，返回 platformPostId
- ✅ 只允许补 callback，不允许重发

### 场景 3：僵尸 Lock
- Lock 超过 30 分钟且 pid 不存在 → 自动清理
- 每次 health check 会触发清理：`GET /health`
- ✅ 不会因为僵尸 lock 永久阻塞

### 场景 4：Mock 模式
- `USE_REAL_PUBLISH=false` 时
- 不创建任何持久化状态
- 使用 `executeMockPublish`，不调用 state/lock 模块
- ✅ Mock 无副作用

## 配置

| 环境变量 | 默认值 | 说明 |
|---------|-------|------|
| `USE_REAL_PUBLISH` | `false` | true=真实发布，false=mock |
| `XHS_PROFILE_DIR` | `/root/.openclaw/xhs-profile-persist` | Chrome profile 目录 |
| `XHS_HEADLESS` | `true` | 浏览器无头模式 |
| `XHS_SCREENSHOT_DIR` | `/tmp/xhs-screenshots` | 截图保存目录 |

## 错误恢复

### 手动检查状态
```bash
cat /root/.openclaw/publish-state/{postId}.json
```

### 清理异常 lock
```bash
# 自动清理（通过 health check）
curl http://localhost:18790/health

# 或手动删除
rm /root/.openclaw/publish-locks/{postId}.lock
```

### 强制重发（仅在异常后）
1. 先删除状态文件：`rm /root/.openclaw/publish-state/{postId}.json`
2. 再删除 lock（如果有）：`rm /root/.openclaw/publish-locks/{postId}.lock`
3. 重新通过 backend 发布

## 测试

```bash
cd /srv/AI-xiaohongshu-/backend
python3 -m pytest tests/test_publish_persistence.py -v
```

测试覆盖：
- ✅ 状态文件创建/读取/更新
- ✅ JSON 不包含敏感信息
- ✅ finalBody 不保存原文
- ✅ submit_clicked 防护
- ✅ Lock 获取/释放
- ✅ 重复 Lock 拒绝
- ✅ 僵尸 Lock 清理
- ✅ Callback 失败保留 platformPostId
- ✅ Mock 不创建状态
- ✅ 完整发布流程防护
