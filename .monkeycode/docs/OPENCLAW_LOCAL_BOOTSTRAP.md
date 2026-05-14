# OpenClaw 本地笔记本启动指南

> 目标：在新装 OpenClaw 的本地笔记本上接入 AI-xiaohongshu 工作环境。
> 编写时间：2026-05-14

---

## 一、环境检查清单

启动前确认以下项目：

```bash
# 1. OpenClaw 版本
openclaw --version

# 2. Node.js 版本（需 v22+）
node --version

# 3. Playwright 浏览器安装
ls ~/.cache/ms-playwright/
# 应包含 chromium-1217 和 chromium_headless_shell-1217

# 4. openclaw.json 是否存在
ls -la /root/.openclaw/openclaw.json

# 5. 是否已配置 AI 模型 provider
python3 -c "
import json
with open('/root/.openclaw/openclaw.json') as f:
    d = json.load(f)
provs = d.get('models', {}).get('providers', {})
for k, v in provs.items():
    print(f'{k}: apiKey={\"已填\" if v.get(\"apiKey\",\"\") else \"未填\"}')
"
```

---

## 二、启动 OpenClaw Gateway

```bash
# 首次启动
openclaw gateway start

# 验证
curl http://127.0.0.1:18789/health
# 或浏览器打开 http://127.0.0.1:18789/
```

### Gateway 未安装时

如果提示 `Gateway service disabled`：

```bash
openclaw gateway install
```

或直接前台运行：

```bash
openclaw
```

---

## 三、接入 QQ Bot

### 3.1 配置 openclaw.json

找到 `channels` 字段，添加：

```json
"channels": {
  "qqbot": {
    "type": "qqbot",
    "appId": "你的QQ机器人appId",
    "token": "你的QQ机器人appSecret"
  }
}
```

### 3.2 风险提示

- **同一 QQ 机器人不能同时接两个 OpenClaw 实例**，消息会冲突
- 云服务器下线前不要在笔记本上启动 QQ 频道
- 切换时：先停云服务器上的 QQ 频道，再启动笔记本的

### 3.3 配置 QQ 消息转发到后端

```bash
# 编辑 /srv/qq-forward-service/forward.sh
# 替换 X-Shared-Secret 为后端配置的值
```

转发脚本会把 QQ 消息 POST 到 `http://127.0.0.1:8000/api/integrations/qq/messages`

---

## 四、启动后端服务

### 4.1 后端 (FastAPI)

```bash
# 安装依赖
cd /srv/AI-xiaohongshu-/backend
pip install -r requirements.txt

# 创建 .env 文件
cat > .env << 'ENV'
QQ_INGEST_SHARED_SECRET=your_forward_secret
OPENCLAW_METRICS_WEBHOOK_URL=http://127.0.0.1:18790/api/openclaw/metrics
OPENCLAW_PUBLISH_WEBHOOK_URL=http://127.0.0.1:18790/api/openclaw/publish
OPENCLAW_METRICS_TIMEOUT_SECONDS=60
ENV

# 启动
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 4.2 前端 (Next.js)

```bash
cd /srv/AI-xiaohongshu-/frontend
pnpm install
pnpm build
npm run start -- --hostname 127.0.0.1 --port 3000
```

### 4.3 Publisher (OpenClaw 发布调度)

```bash
cd /root/.openclaw/workspace/skills/xiaohongshu-publisher
USE_REAL_PUBLISH=true BACKEND_BASE_URL=http://127.0.0.1:8000 \
  node server.js
```

验证：
```bash
curl http://127.0.0.1:18790/health
# 应返回 {"realPublish": true}
```

---

## 五、本地 vs 云服务器环境差异

| 项目 | 云服务器 | 本地笔记本 |
|------|---------|-----------|
| 内存 | 2GB（不足，常 OOM） | 通常充足（WSL 可多分配） |
| 小红书登录态 | 有（两个账号 profile） | **无，需重新登录** |
| QQ Bot | 已配置运行中 | 未配置（需云停后才可接） |
| 系统代理 | 有 http_proxy（需绕过） | 无代理问题 |
| 后端/前端运行 | systemd 服务 | systemd 或前台均可 |
| 仓库代码 | 已拉取最新 | 需 git pull |

---

## 六、必须重新做的事（在本地）

以下工作因涉及敏感信息或机器绑定，无法从云服务器直接迁移：

### 6.1 小红书登录（Chrome Profile）

```bash
# 创建账号1 profile 目录
mkdir -p /root/.openclaw/xhs-profile-persist-account_aeziyo

# 用 Playwright 启动浏览器扫码或 SMS 登录
cd /root/.openclaw/workspace/skills/xiaohongshu-publisher
node -e "
const { chromium } = require('playwright');
(async () => {
  const context = await chromium.launchPersistentContext(
    '/root/.openclaw/xhs-profile-persist-account_aeziyo',
    { headless: false }
  );
  const page = await context.newPage();
  await page.goto('https://creator.xiaohongshu.com/login');
  console.log('请在打开的浏览器中完成登录...');
})();
"
```

登录成功标准：
- URL 不包含 `/login`
- Cookie 包含 `access-token-creator.xiaohongshu.com`

### 6.2 QQ Bot Token

QQ bot 的 appId 和 token 需要重新配置到 openclaw.json。

### 6.3 API Key 配置

模型 provider 的 API key 需要在本地 openclaw.json 中重新填入。

### 6.4 repository.json

数据库文件 `/srv/AI-xiaohongshu-/backend/data/repository.json` 如果是从云服务器复制过来的，确保路径正确。

---

## 七、本地笔记本文档阅读顺序

接手本地 OpenClaw 后，建议按以下顺序阅读文档：

1. **`.monkeycode/docs/DEPLOY_OPENCLAW_SETUP.md`**
   → 系统架构总览，了解各组件和端口关系

2. **`.monkeycode/docs/HANDOFF_OPENCLAW_2026-05-14.md`**
   → 了解已做的工作、踩过的坑、当前状态

3. **`.monkeycode/docs/OPENCLAW_RUNTIME_KNOWLEDGE.md`**
   → 运行时规范：发布流程、metrics 抓取、故障处理

4. **`.monkeycode/docs/XHS_LOGIN_STATE_RUNBOOK.md`**
   → 登录态保护规则（关键！不可破坏）

5. **`.monkeycode/docs/REAL_PUBLISH_RUNBOOK.md`**
   → 真实发布全流程、防重复发布机制

6. **`.monkeycode/docs/PUBLISH_VERIFICATION_LOG.md`**
   → 上次验收记录，了解已验证能力

---

_编写：OpenClaw (沛虾 🦞)_
_日期：2026-05-14_
