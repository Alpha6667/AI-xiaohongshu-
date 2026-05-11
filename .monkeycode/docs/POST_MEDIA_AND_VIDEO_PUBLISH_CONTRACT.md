# 帖子素材展示与视频发布协作契约

## 1. 目标

本轮新增能力分两步交付：

1. 前端在 `/posts/[id]` 展示已发布帖子的图片和视频素材。
2. 后端与 OpenClaw 补齐视频发布能力，但真实发布视频必须等待用户明确授权。

本契约不得影响已通过的真实发布、metrics、source、noteId 精准匹配链路。

## 2. 当前基线

当前后端 `GET /api/posts/{postId}` 已返回：

```json
{
  "assetIds": ["asset_xxx"],
  "assets": [
    {
      "id": "asset_xxx",
      "name": "素材名称",
      "fileName": "cover.jpg",
      "contentType": "image/jpeg",
      "url": "https://example.com/assets/cover.jpg",
      "createdAt": "2026-05-11T00:00:00Z"
    }
  ]
}
```

当前 OpenClaw 图文发布脚本只稳定支持 `content.assets` 中的图片素材，并会进入“上传图文”路径。

## 3. 前端职责

前端负责在帖子详情页展示素材，不负责上传真实小红书页面，也不负责真实发布。

### 3.1 第一阶段前端展示要求

`/posts/[id]` 必须展示 `post.assets`：

1. 图片素材：展示预览图、素材名称、文件名、contentType。
2. 视频素材：展示 video 控件、素材名称、文件名、contentType。
3. 未知素材：展示素材链接、素材名称、文件名、contentType。
4. 无素材时展示“当前帖子暂无素材”。

前端判断规则：

```text
contentType startsWith "image/" -> 图片
contentType startsWith "video/" -> 视频
otherwise -> 文件
```

前端类型应先兼容现有字段，不强依赖后端立刻新增字段。

### 3.2 后续可选字段

后端如新增字段，前端可逐步使用：

```json
{
  "mediaType": "image | video | file",
  "thumbnailUrl": "https://example.com/thumb.jpg",
  "durationSeconds": 12,
  "width": 1080,
  "height": 1920,
  "sizeBytes": 1234567
}
```

前端必须保持兼容：这些字段缺失时，仍根据 `contentType` 展示。

## 4. 后端职责

后端负责稳定资产契约、帖子详情返回和发布 payload 组装。

### 4.1 AssetSummaryResponse 建议扩展

建议后端在保持现有字段不变的基础上，逐步扩展：

```json
{
  "id": "asset_xxx",
  "name": "素材名称",
  "fileName": "video.mp4",
  "contentType": "video/mp4",
  "url": "https://example.com/assets/video.mp4",
  "createdAt": "2026-05-11T00:00:00Z",
  "mediaType": "video",
  "thumbnailUrl": null,
  "durationSeconds": null,
  "width": null,
  "height": null,
  "sizeBytes": null
}
```

### 4.2 发布 payload

后端发给 OpenClaw 的 payload 应保持 `content.assets`，并加入可选媒体类型信息：

```json
{
  "postId": "post_xxx",
  "content": {
    "title": "标题",
    "body": "正文",
    "tags": ["tag"],
    "assets": [
      {
        "id": "asset_xxx",
        "name": "素材名称",
        "url": "https://example.com/assets/video.mp4",
        "contentType": "video/mp4",
        "mediaType": "video"
      }
    ]
  }
}
```

### 4.3 后端保护规则

1. 不手工修改生产 `repository.json`。
2. 不伪造真实发布结果、`platformPostId` 或真实 metrics。
3. 图片和视频素材写入必须走后端接口或后端服务流程。
4. 已发布帖子不得被重复发布。

## 5. OpenClaw 职责

OpenClaw 负责真实小红书页面上传和发布动作。

### 5.1 图片发布

当前图文发布继续使用“上传图文”路径，不改变已通过链路。

### 5.2 视频发布能力准备

视频发布必须独立于图文路径实现，建议根据素材类型分流：

```text
assets contain video/* -> 进入视频发布路径
assets only image/* -> 进入图文发布路径
assets mixed image/* and video/* -> 拒绝发布，返回 non_retryable 错误
```

建议错误码：

```text
unsupported_mixed_media
video_publish_not_ready
video_upload_failed
video_editor_not_loaded
```

真实视频发布前必须满足：

1. 用户明确授权发布该视频帖子。
2. 后端确认目标帖子未发布、无 `platformPostId`。
3. OpenClaw 使用服务器真实登录态。
4. 成功后仍通过已稳定的 noteId 捕获和后端回写链路保存结果。

## 6. 验收流程

### 第一阶段：前端素材展示

1. `GET /api/posts/{postId}` 返回 `assets`。
2. `/posts/[id]` 能看到图片预览。
3. 若 `contentType` 为 `video/*`，页面能看到 video 控件。
4. `pnpm --dir frontend build` 通过。

### 第二阶段：视频发布能力

1. 后端测试覆盖视频 asset payload。
2. OpenClaw 能识别 video asset 并进入视频路径。
3. 未授权时不得真实发布。
4. 授权真实发布后，仍满足 noteId、metrics、source、sync 状态链路完整。

## 7. 禁止事项

1. 禁止提交 `.env`、token、Cookie、Chrome profile。
2. 禁止输出服务器密码、小红书 Cookie、OpenClaw token。
3. 禁止未授权真实发布新视频。
4. 禁止手工修改生产 `repository.json`。
5. 禁止破坏当前已通过的真实发布、metrics、source、noteId 匹配链路。
