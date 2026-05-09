# xiaohongshu-publisher

小红书真实发布执行 skill，提供 POST /api/openclaw/publish webhook 接口。

## 功能

1. 接收 backend 的发布请求
2. 使用浏览器自动化执行小红书发布
3. 回写发布结果到 backend

## 接口

### POST /api/openclaw/metrics

根据 postId / platformPostId 抓取小红书作品真实互动数据。

请求体:
```json
{
  "postId": "post_xxx",
  "platformPostId": "xh_xxx"
}
```

成功响应 (200):
```json
{
  "views": 1523,
  "likes": 89,
  "favorites": 34,
  "comments": 12,
  "followConversions": 3
}
```

失败响应 (4xx/5xx):
```json
{
  "error": "描述信息",
  "errorCode": "metrics_fetch_login_required"
}
```

失败码:
- `auth_failed`: 鉴权失败
- `missing_required_field`: 缺少 platformPostId
- `metrics_fetch_login_required`: 小红书登录态失效
- `metrics_fetch_page_structure_mismatch`: 页面结构解析失败
- `metrics_fetch_timeout`: 页面加载超时
- `metrics_fetch_post_not_found`: 作品不存在 (403/404)
- `metrics_fetch_network_error`: 网络错误
- `metrics_fetch_not_available`: Playwright 不可用
- `metrics_fetch_browser_error`: 浏览器启动失败
- `metrics_fetch_execution_error`: 脚本执行异常

### POST /api/openclaw/publish

请求体:
```json
{
  "requestId": "req_xxx",
  "postId": "post_xxx",
  "operator": "backend",
  "account": {
    "id": "account_xxx",
    "name": "我的小红书",
    "handle": "@xxx"
  },
  "content": {
    "title": "标题",
    "body": "正文",
    "tags": ["标签1", "标签2"],
    "assets": [
      {"id": "asset_1", "url": "http://..."}
    ]
  },
  "callback": {
    "publishResultUrl": "http://127.0.0.1:8000/api/posts/post_xxx/publish-result",
    "authToken": "xxx"
  }
}
```

同步响应:
```json
{
  "publishStatus": "queued",
  "detail": "Publish task accepted and queued",
  "executionId": "exec_xxx",
  "executedAt": "2026-04-25T..."
}
```

## 鉴权

使用 Authorization: Bearer <token> 方式鉴权。
Token 通过环境变量 `OPENCLAW_PUBLISH_AUTH_TOKEN` 配置（必须设置，无默认值）。

## 异步回写

执行完成后，调用 callback.publishResultUrl:
```json
{
  "publishStatus": "succeeded",
  "operator": "openclaw-publisher",
  "detail": "Published successfully",
  "platformPostId": "xh_xxx",
  "executionLogs": [
    "Task received",
    "Browser started",
    "Login verified",
    "Content filled",
    "Images uploaded",
    "Published"
  ]
}
```

失败时:
```json
{
  "publishStatus": "failed",
  "operator": "openclaw-publisher",
  "detail": "Publish failed: rate limited",
  "errorMessage": "Platform rate limited",
  "failureType": "rate_limited",
  "executionLogs": [
    "Task received",
    "Browser started",
    "Login verified",
    "Content filled",
    "Rate limited detected"
  ]
}
```

## 失败分类

- `retryable`: 临时性失败，可重试
- `non_retryable`: 内容被拒绝，不可重试
- `rate_limited`: 平台限流，需等待
