# OpenClaw 小红书真实发布执行器

通过浏览器自动化驱动小红书创作者中心，完成内容发布和指标抓取。

## 目录结构

```
openclaw/
├── README.md           # 本文件 — 启动与配置说明
├── SKILL.md            # API 接口文档（请求/响应格式、鉴权、错误码）
├── server.js           # Webhook 服务入口（POST /api/openclaw/publish）
├── xhs_publish.js      # 小红书发布 Playwright 脚本
└── xhs_metrics.js      # 作品互动指标抓取 Playwright 脚本
```

## 前置条件

- Node.js >= 18
- Playwright Chromium 安装：`npx playwright install chromium`
- 已登录的小红书 Creator Chrome profile（详见下方初始化登录步骤）

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `OPENCLAW_PUBLISH_PORT` | `18790` | Webhook 服务监听端口 |
| `OPENCLAW_PUBLISH_AUTH_TOKEN` | `<OPENCLAW_PUBLISH_AUTH_TOKEN>` | HTTP Bearer 鉴权 Token（必须设置，无默认值） |
| `BACKEND_BASE_URL` | `http://127.0.0.1:8000` | Backend API 基础地址 |
| `USE_REAL_PUBLISH` | `false` | `true` = 真实浏览器发布；`false` = mock 模式 |
| `XHS_PROFILE_DIR` | `/root/.openclaw/xhs-profile-persist` | Chrome profile 路径 |
| `XHS_HEADLESS` | `true` | 是否无头模式运行 |
| `XHS_METRICS_TIMEOUT_MS` | `60000` | 指标抓取超时 ms |
| `OPENCLAW_PUBLISH_WEBHOOK_URL` | — | Backend 调用此服务的完整 URL |

## 启动服务

```bash
# 启动 webhook 服务
cd /srv/AI-xiaohongshu-/openclaw
node server.js
```

## Systemd 托管（推荐）

```ini
[Unit]
Description=OpenClaw XHS Publisher
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/AI-xiaohongshu-/openclaw
ExecStart=/usr/bin/node server.js
Environment="USE_REAL_PUBLISH=true"
Environment="XHS_PROFILE_DIR=/root/.openclaw/xhs-profile-persist"
Environment="OPENCLAW_PUBLISH_AUTH_TOKEN=your-token-here"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## 初始化登录（首次使用）

```bash
# 1. 手动启动 Playwright 浏览器（非无头），扫码登录
XHS_HEADLESS=false node xhs_publish.js '{"title":"测试","body":"测试内容"}'

# 或使用 Playwright Chrome profile 直接打开
npx playwright open --profile-dir=/root/.openclaw/xhs-profile-persist https://creator.xiaohongshu.com/
```

登录成功后，profile 目录 `/root/.openclaw/xhs-profile-persist` 会保存登录态。
后续所有发布和指标抓取复用此 profile，无需重复登录。

## 发布全链路

```
backend publish -> openclaw webhook -> 浏览器自动化发布 ->
publish-result 回写 backend -> metrics-snapshots 回写
```

### 链路说明

1. **Backend 触发发布**：`POST /api/posts/{post_id}/openclaw/execute-publish`
   - Backend 向 `OPENCLAW_PUBLISH_WEBHOOK_URL` 发送发布请求
   - 请求体含 postId、content（title/body/tags/assets）、callback（publishResultUrl）

2. **OpenClaw 执行发布**：`POST /api/openclaw/publish`
   - server.js 接收请求，立即返回 `{publishStatus: "queued"}`
   - 异步启动浏览器（Playwright），模拟登录态、填内容、上传图片、点击发布
   - 网络拦截器捕获 API 返回的 `noteId`

3. **回写发布结果**：`POST /api/posts/{post_id}/publish-result`
   - 发布完成后调用 callback.publishResultUrl
   - 回写内容：`{publishStatus, operator, detail, platformPostId, executionLogs}`

4. **抓取互动指标**：`POST /api/posts/{post_id}/metrics-snapshots`
   - Backend 收到 publish-result 后自动调用 OpenClaw metrics 端点
   - OpenClaw 打开创作者笔记管理页，解析 DOM 获取互动数据
   - 返回 `{views, likes, favorites, comments, followConversions}`

### Mock 模式（开发/测试）

将 `USE_REAL_PUBLISH` 设为 `false`（默认），不会启动真实浏览器：
- 发布：返回 mock 成功 + 假 platformPostId
- 指标：返回随机模拟数据

### 自测步骤

```bash
# 1. 启动 mock 模式服务
USE_REAL_PUBLISH=false node server.js &

# 2. 发送测试发布请求
curl -X POST http://localhost:18790/api/openclaw/publish \
  -H 'Authorization: Bearer <OPENCLAW_PUBLISH_AUTH_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "postId": "post_test_001",
    "content": {"title": "测试标题","body": "测试正文","tags": ["测试"]},
    "callback": {
      "publishResultUrl": "http://127.0.0.1:8000/api/posts/post_test_001/publish-result",
      "authToken": ""
    }
  }'

# 3. 检查服务健康
curl http://localhost:18790/health
```

## 安全说明

- **不要提交** Chrome profile（`/root/.openclaw/xhs-profile-persist/`），其中含登录态 Cookies
- **不要提交** `.env` 文件或真实 Token
- **不要提交** 截图文件
- `XHS_PROFILE_DIR` 路径通过环境变量配置，代码中是指定默认值的说明
