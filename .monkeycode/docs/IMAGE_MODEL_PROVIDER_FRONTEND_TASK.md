# 前端任务单：生图模型厂商配置页

## 目标

新增一个前端可视化配置页，让用户后续能在网页端选择生图厂商、录入 API Key、查看脱敏后的 Key 状态，并在切换厂商时自动切换默认模型。

## 当前约束

1. 当前用户还没有真实 API Key。
2. 本轮前端不需要直接调用第三方图片模型 API。
3. 本轮必须避免把 Key 当成浏览器直调第三方服务的凭据。

## 本轮边界

1. 本轮只做前端配置页与交互承接。
2. 不负责真实生图 API 的浏览器直连。
3. 不负责把 Key 明文保存在本地缓存里长期使用。

## 必须交付

### 1. 新增模型设置页入口

建议新增：

1. `/settings/models`

要求：

1. 在全局导航中提供稳定入口。
2. 页面定位要清楚表达“这里配置 AI 生成能力”，不要做成普通系统设置杂项页。

### 2. 厂商选择区

页面至少支持以下厂商选项：

1. OpenAI
2. 火山方舟
3. 腾讯混元
4. 阿里云通义万相
5. Black Forest Labs
6. Stability AI

要求：

1. 切换厂商后，图片模型输入框自动带出推荐默认模型。
2. 页面应允许用户手动修改模型名。

### 3. API Key 录入与展示

要求：

1. 提供 API Key 输入框。
2. 已保存状态下，页面读取接口时只展示后端返回的脱敏值。
3. 页面文案明确说明：Key 仅用于服务端请求第三方模型，不会在页面端直接调用厂商接口。
4. 不要提供“复制完整 Key”功能。

### 4. 连接参数区

建议至少包含：

1. Provider
2. API Key
3. Image Model
4. Base URL（可选）

要求：

1. Base URL 默认可为空。
2. 如后端返回已有配置，页面需正确回显 Provider、Model、Masked Key 和 Base URL。

### 5. 状态展示与空态

要求：

1. 未配置 Key 时，显示明确空态，而不是让用户以为系统已经可出图。
2. 已配置但尚未测试时，显示“已保存，待测试”之类中间态。
3. 测试失败时，展示后端返回的可读错误信息。

### 6. 与现有发帖工作台的衔接

要求：

1. 当后端返回 `provider_not_configured` 或等价错误时，前端在 `/review` 或触发生成图片的位置给出明确提示。
2. 提供跳转到模型设置页的入口。
3. 不要继续把图片生成失败伪装成已生成默认候选图。

### 7. 验证

必须执行：

1. `cd frontend && npm run lint`
2. `cd frontend && npm run build`

## 建议改动点

1. `frontend/src/components/app-shell.tsx`
2. `frontend/src/app/settings/models/page.tsx`
3. `frontend/src/lib/api/client.ts`
4. `frontend/src/lib/api/types.ts`
5. 与 `/review` 或图片生成入口提示相关的组件

## 验收标准

1. 页面可切换厂商。
2. 切换厂商后可自动带出默认模型。
3. 页面可录入 Key，但读取时只展示脱敏值。
4. 当前没有 Key 时，页面明确提示“尚未配置”，而不是假装可用。
5. 当后端返回“未配置厂商/Key”时，发帖工作台能给出清楚指引。
6. `npm run lint` 通过。
7. `npm run build` 通过。

## 完成后回复格式

1. commit hash
2. commit message
3. 改动文件列表
4. 页面结构说明
5. 厂商切换与默认模型策略说明
6. Key 脱敏展示策略说明
7. `npm run lint` 结果
8. `npm run build` 结果
9. `git status --short`
