# OpenClaw QQ Forward Instruction

请在收到 QQ 用户消息后，自动把原始消息转发到本机 backend：

## 接口

- 方法：`POST`
- 地址：`http://127.0.0.1:8000/api/integrations/qq/messages`
- Header：`Content-Type: application/json`

## 请求体

```json
{
  "source": "qq",
  "senderId": "<QQ用户ID>",
  "senderName": "<QQ昵称>",
  "conversationId": "<群ID或私聊会话ID>",
  "content": "<用户原始消息>",
  "sentAt": "<ISO 8601时间>",
  "eventId": "<该消息唯一ID，重试时保持不变>",
  "signature": "<QQ_INGEST_SHARED_SECRET>"
}
```

## 要求

1. `source` 固定为 `qq`
2. `eventId` 必须稳定唯一，用于后端幂等去重
3. `signature` 必须等于 backend systemd 中配置的 `QQ_INGEST_SHARED_SECRET`
4. 如果请求超时或返回 `5xx`，可以用同一个 `eventId` 重试
5. 收到 HTTP `201` 且 `accepted=true`，视为转发成功
6. 本轮只负责把 QQ 消息送进 backend 生成 task，不触发小红书发布

## 成功响应示例

```json
{
  "accepted": true,
  "duplicated": false,
  "rawMessageId": "qqmsg_xxx",
  "messageTaskId": "taskmsg_xxx"
}
```

## 重复消息响应示例

```json
{
  "accepted": true,
  "duplicated": true,
  "rawMessageId": "qqmsg_xxx",
  "messageTaskId": "taskmsg_xxx"
}
```

## 验收

请先用一条测试消息验证：

1. backend 返回 `201`
2. `/api/tasks` 出现对应新任务
3. 新任务 `stage` 为 `pending_generation`
