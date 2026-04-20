# AI Xiaohongshu Posting Platform

一个面向单账号运营的小红书 AI 发帖平台单仓项目骨架。

## 项目目标

- 根据主题生成小红书标题、正文和标签
- 支持 AI 生成图片和人工上传图片
- 支持人工审核、修改后再发布
- 自动采集浏览、点赞、收藏、评论和关注转化等指标
- 提供后台管理页面查看帖子、草稿和数据看板

## 仓库结构

```text
frontend/   Next.js 后台管理端
backend/    FastAPI 主业务 API
worker/     异步任务与自动采集任务
shared/     共享提示词、常量与结构定义
.monkeycode/ 需求、设计、任务与团队协作文档
infra/      部署与运行环境配置
scripts/    本地开发与部署脚本
```

## 当前阶段

当前提交仅初始化第一版项目结构，方便后续前端、后端和任务服务并行开发。

## 本地开发

### 前端

```bash
cd frontend
pnpm install
pnpm dev
```

### 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload
```

### 基础依赖

```bash
docker compose up -d postgres redis
```
