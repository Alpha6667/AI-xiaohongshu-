# 系统架构

## 总体结构

- `frontend/`：后台管理页面
- `backend/`：业务 API、数据模型、审核与发布流程
- `worker/`：AI 文案生成、图片生成、指标采集等异步任务
- `shared/`：共享提示词与常量

## 第一版范围

- 单账号运营
- 人工审核后发布
- 自动采集帖子后台数据
- `Next.js + FastAPI + PostgreSQL + Redis`
