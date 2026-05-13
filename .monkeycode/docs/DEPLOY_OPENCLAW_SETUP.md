# OpenClaw + AI-Xiaohongshu 部署指南

> 编写日期：2026-05-14
> 原服务器：腾讯云 2C2G（即将过期）
> 目标：本地电脑（或新服务器）

---

## 一、架构总览

```
┌──────────────────────────────────────────────────────┐
│                     单机部署                           │
│                                                        │
│  AI-xiaohongshu 项目: /srv/AI-xiaohongshu-/            │
│  ├── backend/    (FastAPI, port 8000)                  │
│  └── frontend/   (Next.js, port 3000)                  │
│                                                        │
│  OpenClaw publisher: /root/.openclaw/workspace/         │
│  └── skills/xiaohongshu-publisher/                     │
│       ├── server.js      (webhook 调度, port 18790)     │
│       ├── xhs_publish.js (真实发布执行器)                │
│       └── xhs_metrics.js (metrics 抓取执行器)            │
│                                                        │
│  QQ 消息转发: /srv/qq-forward-service/                  │
│                                                        │
│  Chrome profiles (登录态):                               │
│  /root/.openclaw/xhs-profile-persist-{accountId}/       │
│                                                        │
│  跨系统代理: ~/.openclaw/workspace/skills/              │
│              xiaohongshu-publisher/server.js 自动绕过    │
└──────────────────────────────────────────────────────┘
```

---

## 二、前置依赖

### 2.1 系统要求

- Linux x86_64（推荐 Ubuntu 22.04+ / Debian 12+）
- 至少 4GB 内存（2GB 运行 Chromium 容易 OOM）
- 至少 10GB 磁盘空间
- Node.js v22.22.0+
- Python 3.11+
- Git

### 2.2 安装 Node.js（nvm）

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22.22.0
nvm alias default 22.22.0
```

### 2.3 安装 Playwright

```bash
npm install -g playwright
npx playwright install chromium
npx playwright install-deps chromium
```

验证：
```bash
npx playwright --version
ls ~/.cache/ms-playwright/
# 应看到 chromium-1217 和 chromium_headless_shell-1217
```

### 2.4 安装 Python 依赖

```bash
cd /srv/AI-xiaohongshu-/backend
pip install -r requirements.txt
# 关键包: fastapi, uvicorn, pydantic, httpx
```

### 2.5 安装 pnpm（前端构建）

```bash
npm install -g pnpm
cd /srv/AI-xiaohongshu-/frontend
pnpm install
```

---

## 三、拉取项目

### 3.1 AI-xiaohongshu 项目（后端+前端）

```bash
git clone git@github.com:Alpha6667/AI-xiaohongshu-.git /srv/AI-xiaohongshu-
cd /srv/AI-xiaohongshu-
git checkout 260509-chore-add-final-archive
```

### 3.2 OpenClaw publisher 脚本

```bash
mkdir -p /root/.openclaw/workspace/skills
# publisher 已作为子目录在 AI-xiaohongshu 仓库中？
# 否，publisher 单独在以下路径，需手动复制：
# 从原服务器复制这些文件：
#   /root/.openclaw/workspace/skills/xiaohongshu-publisher/
```

---

## 四、配置文件

### 4.1 后端 .env

在 `/srv/AI-xiaohongshu-/backend/` 创建 `.env`：

```bash
# backend/.env
QQ_INGEST_SHARED_SECRET=<你的qq-forward密钥>
OPENCLAW_METRICS_WEBHOOK_URL=http://127.0.0.1:18790/api/openclaw/metrics
OPENCLAW_PUBLISH_WEBHOOK_URL=http://127.0.0.1:18790/api/openclaw/publish
OPENCLAW_PUBLISH_AUTH_TOKEN=<publisher认证token>
OPENCLAW_METRICS_AUTH_TOKEN=<同上>
OPENCLAW_METRICS_TIMEOUT_SECONDS=60
```

### 4.2 Systemd 服务

**backend** (`/etc/systemd/system/ai-xiaohongshu-backend.service`)：
```ini
[Unit]
Description=AI Xiaohongshu Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/AI-xiaohongshu-/backend
EnvironmentFile=/srv/AI-xiaohongshu-/backend/.env
ExecStart=/usr/bin/python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

**frontend** (`/etc/systemd/system/ai-xiaohongshu-frontend.service`)：
```ini
[Unit]
Description=AI Xiaohongshu Frontend
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/AI-xiaohongshu-/frontend
Environment=INTERNAL_API_BASE_URL=http://127.0.0.1:8000
Environment=NEXT_PUBLIC_API_BASE_URL=
Environment=PATH=/root/.nvm/versions/node/v22.22.0/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/root/.nvm/versions/node/v22.22.0/bin/npm run start -- --hostname 127.0.0.1 --port 3000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

**publisher** (`/etc/systemd/system/openclaw-xhs-publisher.service`)：
```ini
[Unit]
Description=OpenClaw Xiaohongshu Publisher Webhook
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/.openclaw/workspace/skills/xiaohongshu-publisher
ExecStart=/root/.nvm/versions/node/v22.22.0/bin/node server.js
Restart=always
RestartSec=5
Environment=OPENCLAW_PUBLISH_PORT=18790
Environment=OPENCLAW_PUBLISH_AUTH_TOKEN=<publisher认证token>
Environment=PATH=/root/.nvm/versions/node/v22.22.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
Environment=NODE_PATH=/root/.nvm/versions/node/v22.22.0/lib/node_modules
Environment=BACKEND_BASE_URL=http://127.0.0.1:8000
Environment=USE_REAL_PUBLISH=true
Environment=XHS_HEADLESS=true

[Install]
WantedBy=multi-user.target
```

### 4.3 repository.json

初始数据存放在 `/srv/AI-xiaohongshu-/backend/data/repository.json`。
仓库中有一个 seed 版本，首次启动后端会自动创建。

---

## 五、登录态（Chrome Profile）

### 5.1 核心约束

```
                    ⚠️ 最关键的资产 ⚠️
      Chrome Profile 目录包含小红书登录态 Cookie

  目录: /root/.openclaw/xhs-profile-persist-{accountId}

  规则:
  - 禁止删除
  - 禁止打包上传到 Git
  - 禁止输出 Cookie/token 值
  - 不同账号 profile 不能共用
```

### 5.2 多账号 Profile 命名规则

| 账号 | accountId | Profile 路径 |
|------|-----------|-------------|
| AEziyo | `account_aeziyo` | `/root/.openclaw/xhs-profile-persist-account_aeziyo` |
| 新账号 | `account_{新ID}` | `/root/.openclaw/xhs-profile-persist-account_{新ID}` |

### 5.3 登录方式

**方式 A：SMS 验证码（推荐）**
1. 用 Playwright 打开 `https://creator.xiaohongshu.com/login`
2. 填手机号，勾选协议，点"发送验证码"
3. 手动输入验证码
4. 登录后确认 Cookie 包含 `access-token-creator`

**方式 B：扫码登录**
1. 用 Playwright 打开 `https://www.xiaohongshu.com/explore`
2. 点击右上角用户头像→"登录"
3. 用手机小红书 APP 扫码
4. ⚠️ 需要确保 creator 域名也拿到 `access-token-creator`（有时只拿到 web session）

### 5.4 登录态检查脚本

```javascript
const { chromium } = require('playwright');
const profilePath = '/root/.openclaw/xhs-profile-persist-account_aeziyo';

(async () => {
  const context = await chromium.launchPersistentContext(profilePath, {
    headless: true, viewport: { width: 1365, height: 768 },
    args: ['--no-sandbox']
  });
  const page = await context.newPage();
  await page.goto('https://creator.xiaohongshu.com/new/home', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 3000));

  const url = page.url();
  const isLoggedIn = !url.includes('/login') && !url.includes('signin');
  console.log('Login OK:', isLoggedIn);

  await context.close();
})();
```

---

## 六、启动服务（启动顺序）

```bash
# 1. 启动后端
systemctl start ai-xiaohongshu-backend.service
# 验证: curl http://127.0.0.1:8000/api/health

# 2. 启动前台
systemctl start ai-xiaohongshu-frontend.service
# 验证: curl http://127.0.0.1:3000

# 3. 启动 publisher
systemctl start openclaw-xhs-publisher.service
# 验证: curl http://127.0.0.1:18790/health
# 应返回: {"status":"healthy","realPublish":true}
```

---

## 七、发布与 Metrics 测试

### 7.1 创建测试帖子

```bash
curl -X POST http://127.0.0.1:8000/api/posts \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "测试帖",
    "body": "这是一个测试\n#测试",
    "accountId": "account_aeziyo"
  }'
```

### 7.2 触发发布

```bash
curl -X POST http://127.0.0.1:8000/api/posts/{postId}/publish \
  -H 'Content-Type: application/json' \
  -d '{"comment": "首次发布测试"}'
```

### 7.3 查看 publisher 日志

```bash
journalctl -u openclaw-xhs-publisher.service -f
```

### 7.4 刷新 metrics

```bash
curl -X POST http://127.0.0.1:8000/api/posts/{postId}/refresh-metrics
```

---

## 八、QQ 消息转发服务

### 8.1 转发脚本

```bash
# /srv/qq-forward-service/forward.sh
#!/bin/bash
# QQ消息转发: forward.sh <sender_id> <sender_name> <conversation_id> <content>
SENDER_ID="$1"
SENDER_NAME="$2"
CONVERSATION_ID="$3"
CONTENT="$4"
SENT_AT="${5:-$(date -u +"%Y-%m-%dT%H:%M:%S+00:00")}"

EVENT_ID="qq_event_$(echo -n "${SENDER_ID}:${CONVERSATION_ID}:${CONTENT}" | sha256sum | cut -c1-16)"

curl -s -X POST "http://127.0.0.1:8000/api/integrations/qq/messages" \
  -H "Content-Type: application/json" \
  -H "X-Shared-Secret: <你的qq-forward密钥>" \
  -d "{
    \"sender_id\": \"${SENDER_ID}\",
    \"sender_name\": \"${SENDER_NAME}\",
    \"conversation_id\": \"${CONVERSATION_ID}\",
    \"content\": \"${CONTENT}\",
    \"event_id\": \"${EVENT_ID}\",
    \"sent_at\": \"${SENT_AT}\"
  }"
```

---

## 九、手动发布（解决 headless 被拦截）

如果 headless 模式发布按钮点不动，用 Xvfb + headed 模式：

```bash
# 安装 Xvfb
apt install xvfb

# 启动虚拟显示器
Xvfb :99 -screen 0 1280x1024x24 &
export DISPLAY=:99

# 启动 headed Chromium
Xvfb :99 -screen 0 1280x1024x24 &
xvfb-run node xhs_publish.js
```

或者用 VNC 远程查看：
```bash
x11vnc -display :99 -forever -shared &
```

---

## 十、OpenClaw 配置摘要

### 10.1 openclaw.json

```json
{
  "gateway": {
    "mode": "local",
    "auth": {
      "token": "<你的gateway_token>"
    }
  },
  "channels": {
    "qqbot": {
      "type": "qqbot",
      "appId": "<QQ机器人appId>",
      "token": "<QQ机器人token>"
    }
  },
  "models": {
    "jdcloud/GLM-5": {
      "apiKey": "<京东云API密钥>",
      "baseUrl": "https://wukong-api.jd.com/v1"
    },
    "jdcloud/DeepSeek-V3.2": {
      "apiKey": "<京东云API密钥>",
      "baseUrl": "https://wukong-api.jd.com/v1"
    }
  }
}
```

### 10.2 关键文件清单

| 文件 | 来源 | 是否需手动配置 |
|------|------|--------------|
| `/srv/AI-xiaohongshu-/backend/app/` | Git pull | ✅ 自动 |
| `/srv/AI-xiaohongshu-/frontend/` | Git pull | ✅ 自动（需 pnpm build） |
| `/srv/AI-xiaohongshu-/backend/data/repository.json` | 运行时生成 | ❌ 需从旧服务器复制 |
| `/root/.openclaw/workspace/skills/xiaohongshu-publisher/` | 需手动复制 | ❌ 需从旧服务器复制 |
| `/root/.openclaw/xhs-profile-persist-{accountId}/` | 扫码/SMS 登录 | ❌ 需重新登录 |
| `/root/.openclaw/openclaw.json` | 初始配置 | ❌ 需配置 API key |
| `/srv/qq-forward-service/forward.sh` | 需手动创建 | ❌ 需编辑密钥 |

---

## 十一、部署步骤总结（新电脑）

```bash
# Step 1: 系统依赖
apt update && apt install -y curl git python3 python3-pip xvfb

# Step 2: Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22.22.0

# Step 3: Playwright
npm install -g playwright
npx playwright install chromium
npx playwright install-deps chromium

# Step 4: 拉取项目
git clone git@github.com:Alpha6667/AI-xiaohongshu-.git /srv/AI-xiaohongshu-
cd /srv/AI-xiaohongshu- && git checkout 260509-chore-add-final-archive

# Step 5: Python 依赖
cd /srv/AI-xiaohongshu-/backend && pip install -r requirements.txt

# Step 6: 前端构建
cd /srv/AI-xiaohongshu-/frontend
npm install -g pnpm
pnpm install
pnpm build

# Step 7: 复制 publisher 脚本到 /root/.openclaw/workspace/skills/xiaohongshu-publisher/

# Step 8: 创建 Profile 目录并登录小红书

# Step 9: 创建 repository.json（或从旧服务器复制）

# Step 10: 配置 systemd 服务并启动
cp deploy/systemd/*.service /etc/systemd/system/
systemctl daemon-reload
systemctl start ai-xiaohongshu-backend.service
systemctl start ai-xiaohongshu-frontend.service
systemctl start openclaw-xhs-publisher.service
```

---

## 十二、常见问题

### Q1: 后端启动报 AccountStatus 枚举错误
- 检查 `repository.json` 中 `accounts.*.status` 值是否在枚举中
- 允许值：`online`, `offline`, `error`, `connecting`, `disconnected`

### Q2: 点击发布按钮后无 API 请求
- 可能被小红书 headless 检测拦截
- 尝试 Xvfb headed 模式
- 尝试换图（图片侵权会阻止 API 发出）

### Q3: 素材文件路径不对
- asset 记录的 `url` 字段必须设为**本地绝对路径**（如 `/root/.openclaw/media/asset_{hash}.jpg`），而非 `/api/assets/{id}/content`

### Q4: 内存不足
- 2GB 内存下运行 Chrome + Python + Node 容易 OOM
- 建议升级到 4GB+
- 可用 `pkill -f chrome-headless-shell` 定期清理僵尸进程

### Q5: Cookie 未持久化
- `context.close()` 时才会 flush Cookie 到磁盘
- 如果 context 被 OOM kill，Cookie 不会保存
- 登录后先 `await context.close()` 再开新 context 验证

---

## 十三、参考资料

### 仓库
- GitHub: `github.com/Alpha6667/AI-xiaohongshu-`
- 分支: `260509-chore-add-final-archive`

### 内部文档（在仓库中）
- `.monkeycode/docs/XHS_LOGIN_STATE_RUNBOOK.md` — 登录态手册
- `.monkeycode/docs/REAL_PUBLISH_RUNBOOK.md` — 发布流程手册
- `.monkeycode/docs/PUBLISH_VERIFICATION_LOG.md` — 验收日志
- `.monkeycode/docs/HANDOFF_OPENCLAW_2026-05-14.md` — 交接记录

### 关键 Commit
| Commit | 内容 |
|--------|------|
| `2763de5` | Metrics DOM 映射最终修复 |
| `54b6ec8` | followConversions 兼容后端 schema |
| `2c0ddda` | ✅ 确认可用的 metrics 版本（无反检测参数） |
| `aa03b8f` | Tasks 页面修复 |

---

_编写：OpenClaw (沛虾 🦞)_
_日期：2026-05-14_
_原服务器：腾讯云_
