# Architecture Sync

## 当前约束

- 单账号
- 人工审核后发布
- 自动采集后台数据
- 前端 `Next.js`
- 后端 `FastAPI`

## 当前协作边界

- 前端先围绕 `dashboard`、`posts`、`review`、`assets` 路由做后台壳子与表单。
- 后端先围绕草稿、素材、审核、发布、指标快照做数据模型和 API。
- worker 先只提供任务入口和状态流转，不要求第一阶段接通真实模型或真实平台。
