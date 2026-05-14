# Handoff：2026-05-14 OpenClaw 运维交接记录

> 编写时间：2026-05-14 22:30 CST
> 编写者：OpenClaw
> 交接人：大哥

---

## 一、工作完成

### 1. Metrics DOM 映射修复（final）

**背景**：小红书创作者中心笔记列表页改版，卡片底部图标顺序变化，导致 `xhs_metrics.js` 部分字段映射错误。

**创作者中心列表页图标顺序（确认）**：

| 索引 | 指标 | DOM 图标位置 |
|------|------|-------------|
| nums[0] | 浏览 | 第一个图标 |
| nums[1] | 评论 | 第二个图标 |
| nums[2] | 点赞 | 第三个图标 |
| nums[3] | 收藏 | 第四个图标 |
| nums[4] | 分享 | 第五个图标 |

**修复历史**：
- `a1e41fb` 尝试修复但搞反了点赞/收藏映射（收藏 `nums[2]`、点赞 `nums[3]`），且丢弃分享数据
- `2763de5` 最终修复（正确映射，与 DOM 顺序一致）
- `54b6ec8` 兼容后端 schema，分享数据暂存到 `followConversions` 字段

**生产验证**：
- postId: `post_9100f36d13`
- platformPostId: `6a026a40000000003600289d`
- DOM nums: `[10, 0, 2, 1, 1]`
- views=10, comments=0, likes=2, favorites=1, followConversions=1
- 与 APP 显示"赞和收藏 3"(点赞2+收藏1) 完全吻合
- source: `xhs_creator_center`

### 2. 多账号 Profile 隔离

**命名规则**：`/root/.openclaw/xhs-profile-persist-{accountId}`

| 账号 | accountId | Profile 路径 | 状态 |
|------|-----------|-------------|------|
| AEziyo | `account_aeziyo` | `/root/.openclaw/xhs-profile-persist-account_aeziyo` | ✅ 已连接，可发布 + metrics |
| 5D7F8C0C | `account_877059946` | `/root/.openclaw/xhs-profile-persist-account_877059946` | ✅ 已连接（SMS 登录），有 access-token-creator |

**迁移过程**：`mv /root/.openclaw/xhs-profile-persist /root/.openclaw/xhs-profile-persist-account_aeziyo`

**server.js 改造**：从 webhook payload 动态读取 `profilePath`，设置 `XHS_PROFILE_DIR` 环境变量。

### 3. 账号2 登录流程

**账号2**：account_877059946，小红书 ID 5D7F8C0C

**登录方式**：SMS 验证码
1. 手动输入手机号
2. 勾选用户协议 checkbox
3. 点击"发送验证码"（找 `textContent.trim() === '发送验证码'` 且 `childElementCount === 0` 的最内层 DIV）
4. 人工输入验证码
5. 点击"登录"按钮
6. 验证：访问 `creator.xiaohongshu.com/new/home` 确认不跳转登录页
7. 确认 Cookie 包含 `access-token-creator`

**验证**：SMS 登录后新的 playwright 进程成功访问 `/publish/publish`（`PUBLISH_OK: true`）。

### 4. 账号2 发布尝试

**结果**：发布按钮点击后小红书前端 JS 层拦截了 `note/post` API 请求发出。

**日志模式**：
```
Publish click: clicked
...（没有 CAPTURED NOTE ID）...
Writeback failed: socket hang up
```

**网络监控验证**：点击后仅有图片上传（阿里云 OSS）请求，没有任何 `xiaohongshu.com/api` 的 note/post 请求被触发。

### 5. 账号1 帖子发布（成功）

**postId**：`post_c99f744268`
**accountId**：`account_aeziyo`
**platformPostId**：`6a04d84e000000003503b141`
**内容**：穿越回19世纪疯狂星期四复古风 + KFC 图片

**关键发现**：**某些 PNG 图片可能被小红书判定侵权或格式不支持**，换图后一次成功。

### 6. 素材关联修复

**问题**：`POST /api/posts/{postId}` 返回 `assets: []`，前端显示"当前帖子没有关联素材"。

**修复**：
1. 手动在 `repository.json` 中创建 asset 记录（需要字段：`id`, `name`, `url`, `type`）
2. `url` 必须设为**本地绝对文件路径**（如 `/root/.openclaw/media/asset_{hash}.jpg`），而非 `/api/assets/{id}/content`
3. asset Schema 字段需求（memory.py `_load_from_payload`）：
   - 必需：`id`, `name`, `url`, `type`
   - 可选：`file_name`, `content_type`, `created_at`, `thumbnail_url`, `width`, `height`
4. `content_type` 建议设为 `image/jpeg` 而非默认的 `application/octet-stream`

### 7. Publisher 模式切换

**问题**：Publisher 启动时未传 `USE_REAL_PUBLISH=true`，跑在 mock 模式，mock metrics 覆盖了后端真实数据。

**正确启动**：
```bash
cd /root/.openclaw/workspace/skills/xiaohongshu-publisher \
  && USE_REAL_PUBLISH=true BACKEND_BASE_URL=http://127.0.0.1:8000 \
  nohup node server.js > /tmp/publisher_real.log 2>&1 &
```

**验证**：
```bash
curl http://127.0.0.1:18790/health
# 应返回 {"realPublish": true}
```

---

## 二、遇到的问题

### 1. 创作者中心 DOM 映射反复

旧版 metrics 脚本映射与新版本小红书 UI 不一致。需人工截图 + DOM 探测反复确认。最终通过 SVG path 分析确认图标顺序。

### 2. explore 域扫码 vs creator 域扫码

`www.xiaohongshu.com/explore` 扫码只拿到普通 web session，`creator.xiaohongshu.com/publish/publish` 仍返回 401，Cookie 缺少 `access-token-creator`。必须**在 creator 域名下完成扫码/SMS 登录**。

### 3. 切换二维码入口失效

创作者登录页右上角的 IMG 元素（class `css-wemwzq`，坐标约 1215, 239）点击多次未切换到扫码页。可能是该入口在当前版本不可用或已移除。

### 4. Cookie 持久化时机

`Playwright.launchPersistentContext()` 在 `context.close()` 时 flush Cookie 到磁盘。context 被 OOM kill 或未正常关闭时 Cookie 不会写入 profile 目录。

### 5. 账号2 headless 发布拦截

账号2在 headless 模式下点击发布按钮，小红书 JS 层拦截了 API 请求。账号1不受此影响（同为 headless 模式）。疑似新注册账号反爬等级更高。

### 6. 2GB 服务器 OOM

多次 OOM kill 导致 curl 请求被 kill、后端进程被 systemd auto-restart、数据库写入不完整。

### 7. 素材文件跨服务器

OpenClaw 和 AI-xiaohongshu 在同一服务器，但 asset 记录创建后需手动复制文件到后端能找到的路径。

### 8. profile 隔离约束

不同账号的 profile 目录不能共用或复制。

### 9. xhs_publish.js 反检测参数破坏发布

`45e9953` 添加了 `--disable-blink-features=AutomationControlled`、自定义 UA 和 `addInitScript`，**反而触发更严格检测**。回滚到 `2c0ddda`（无反检测参数）后账号1成功发布。

**结论**：对小红书少加反检测参数比多增加更安全。

### 10. 图片可能导致发布按钮无响应

某些 PNG 图片（1197x1314）可正常上传到编辑器但点击发布后**不触发任何 API 请求**。换用大哥手机发的 JPG（1080x1919）后一次成功。推测小红书前端在点击发布时可能会对已上传图片做合规检查，不合规则阻止按钮行为而非弹出错误。

---

## 三、当前运行状态

### 3.1 服务列表（云服务器）

| 服务 | 端口 | 状态 | 备注 |
|------|------|------|------|
| Backend (FastAPI) | 8000 | ✅ active | account_aeziyo online |
| Publisher (Node.js) | 18790 | ✅ active | realPublish=true |
| Frontend (Next.js) | 3000 | ✅ active | 含 tasks 页面 |
| OpenClaw Gateway | 18789 | ✅ active | |

### 3.2 账号状态

| 账号 | Profile | 可发布 | 可 metrics |
|------|---------|--------|-----------|
| account_aeziyo | `/root/.openclaw/xhs-profile-persist-account_aeziyo` | ✅ headless 成功 | ✅ |
| account_877059946 | `/root/.openclaw/xhs-profile-persist-account_877059946` | ❌ headless 拦截 | ✅（同一域名） |

### 3.3 核心文件路径

| 文件 | 路径 |
|------|------|
| server.js | `/root/.openclaw/workspace/skills/xiaohongshu-publisher/server.js` |
| xhs_publish.js | `/root/.openclaw/workspace/skills/xiaohongshu-publisher/xhs_publish.js`（回滚至 2c0ddda） |
| xhs_metrics.js | `/root/.openclaw/workspace/skills/xiaohongshu-publisher/xhs_metrics.js` |
| repository.json | `/srv/AI-xiaohongshu-/backend/data/repository.json` |
| publisher log | `/tmp/publisher_real.log` |
| OpenClaw config | `/root/.openclaw/openclaw.json` |
| QQ forward 脚本 | `/srv/qq-forward-service/forward.sh` |

### 3.4 关键配置

- publisher: `USE_REAL_PUBLISH=true`
- metrics: `USE_REAL_PUBLISH=true`
- `XHS_PROFILE_DIR`：由 server.js 根据 `task.account.profilePath` 动态设置
- 系统代理：云服务器配置了 http_proxy 环境变量，Chromium 内 fetch 会走代理导致 503。server.js 在 spawn 子进程时清除了代理环境变量。

---

## 四、未完成事项

### 4.1 账号2 headless 发布

- 已被小红书 JS 层拦截
- 可能的解决路径：Xvfb headed 模式 / 手动 APP 发布 / 账号1 代替发布

### 4.2 Publisher systemd 服务化

- 当前 publisher 通过 `nohup node server.js` 手动启动
- 需要注册为 systemd 服务实现自动重启

### 4.3 QQ 渠道切换

- 云服务器和本地笔记本不能同时接同一个 QQ 机器人
- 需要云服务器下线后笔记本才可接 QQ

### 4.4 repository.json 备份

- 目前没有配置定期备份

### 4.5 素材自动关联

- 当前 asset 记录需手动创建并关联到 post

### 4.6 跨平台部署

- OpenClaw 快照包已 push 到 `releases/` 目录
- 部署指南见 `DEPLOY_OPENCLAW_SETUP.md`

---

## 五、环境变量参考

```bash
# Publisher
USE_REAL_PUBLISH=true
BACKEND_BASE_URL=http://127.0.0.1:8000
XHS_HEADLESS=true
XHS_PROFILE_DIR=/root/.openclaw/xhs-profile-persist-{accountId}

# Backend
# 启动: python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Frontend
# 启动: systemctl ai-xiaohongshu-frontend.service
```

---

## 六、重要 Commit 列表

| Commit | 描述 | 仓库/分支 |
|--------|------|-----------|
| `2763de5` | 修正 DOM 字段映射——点赞/收藏对调修复 | openclaw |
| `54b6ec8` | followConversions 兼容后端 schema | openclaw |
| `115f785` | metrics source 修复（加 `source: xhs_creator_center`） | openclaw |
| `45e9953` | ❌ 添加反检测参数（破坏发布） | openclaw |
| `2c0ddda` | ✅ 确认可用的 metrics 脚本版本（无反检测参数） | openclaw |
| `aa03b8f` | tasks 页面布局修复 | 260509-chore-add-final-archive |
| `d8286fa` | 新增 OpenClaw 初始化配置模板（openclaw-init/） | 260509-chore-add-final-archive |
| `306cb5d` | OpenClaw 系统快照包（releases/*.tar.gz） | 260509-chore-add-final-archive |
| `10eea02` | OpenClaw 部署指南 | 260509-chore-add-final-archive |
| `66f2bd2` | OpenClaw 交接记录（本文初版） | 260509-chore-add-final-archive |

---

## 七、本地笔记本接手时的第一步

1. **确认 OpenClaw 已安装**
   ```bash
   openclaw --version
   ```
2. **配置 openclaw.json**（至少配一个模型 provider）
3. **启动 gateway**
   ```bash
   openclaw gateway start
   ```
4. **验证 Web UI**
   浏览器打开 `http://127.0.0.1:18789/`
5. **安装 Playwright**（如未装）
   ```bash
   npx playwright install chromium
   npx playwright install-deps chromium
   ```
6. **拉取项目代码**（如未拉）
   ```bash
   git clone git@github.com:Alpha6667/AI-xiaohongshu-.git /srv/AI-xiaohongshu-
   cd /srv/AI-xiaohongshu- && git checkout 260509-chore-add-final-archive
   ```
7. **阅读下面文档顺序**
   - `DEPLOY_OPENCLAW_SETUP.md` → 系统架构
   - `XHS_LOGIN_STATE_RUNBOOK.md` → 登录态保护
   - `REAL_PUBLISH_RUNBOOK.md` → 发布流程
   - `OPENCLAW_RUNTIME_KNOWLEDGE.md` → 运行时知识
   - `OPENCLAW_LOCAL_BOOTSTRAP.md` → 本地启动指南

---

_交接人：OpenClaw (沛虾 🦞)_
_日期：2026-05-14_
