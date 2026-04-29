# 服务器最小上线方案

## 目标

把当前项目以最小可用方式部署到一台 Linux 服务器上，用于你自己做真实联调和功能补口验证。

## 当前适合采用的部署方式

当前项目最适合先采用：

1. 单机部署
2. 前端 `Next.js` 独立进程
3. 后端 `FastAPI` 独立进程
4. `Nginx` 反向代理统一入口
5. 后端继续使用本地持久化文件 `backend/data/repository.json`

说明：

1. 当前后端虽然暴露了 `DATABASE_URL`、`REDIS_URL`，但主数据实际仍保存在 `backend/data/repository.json`。
2. 因此这轮不需要先上 PostgreSQL 或 Redis 才能跑起来。
3. 这非常适合先在你的服务器上快速验证整套主链路。

## 当前可上线范围

当前上线后，可以重点验证：

1. 前端页面访问
2. 后端 API 可用性
3. QQ / OpenClaw 到 backend 入站链路
4. 内容确认与发布状态流转
5. 已有的小红书真实发布闭环复用

当前不要误判已经完整打通的部分：

1. 点赞、收藏、评论的数据结构和展示位已经有了
2. 但“自动从小红书真实拉回这些数据”的链路还没有完全收口
3. 图片模型配置页和真实生图 API 接入也仍在待补阶段

## 推荐目录

建议在服务器上放到：

```text
/opt/ai-xiaohongshu
```

## 运行端口

推荐使用：

1. 前端：`127.0.0.1:3000`
2. 后端：`127.0.0.1:8000`
3. Nginx 对外暴露：`80` 或 `443`

## 前端环境变量

前端生产环境至少需要：

```bash
INTERNAL_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_API_BASE_URL=
```

说明：

1. 当前前端已经内置 `/api` 反代配置。
2. 服务端渲染时会优先走 `INTERNAL_API_BASE_URL`。
3. 若前端和后端都在同一台机器，这样配置最简单。

## 后端环境变量

后端生产环境至少需要：

```bash
BACKEND_CORS_ORIGINS=https://你的域名
QQ_INGEST_SHARED_SECRET=替换成你自己的共享密钥
```

可选但当前不是主阻塞：

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_xiaohongshu
REDIS_URL=redis://localhost:6379/0
```

说明：

1. 当前主数据不是从 PostgreSQL 读写。
2. 先不配数据库也可以完成这轮最小部署。

## 最小上线步骤

### 1. 拉代码

```bash
git clone <你的仓库地址> /opt/ai-xiaohongshu
cd /opt/ai-xiaohongshu
git checkout 260420-chore-plan-first-iteration
```

### 2. 安装前端依赖并构建

```bash
cd /opt/ai-xiaohongshu/frontend
npm install
npm run build
```

### 3. 安装后端依赖

```bash
cd /opt/ai-xiaohongshu/backend
python3 -m venv .venv
. .venv/bin/activate
pip install --break-system-packages -e .
```

### 4. 启动后端

```bash
cd /opt/ai-xiaohongshu/backend
BACKEND_CORS_ORIGINS=https://你的域名 QQ_INGEST_SHARED_SECRET=替换成你自己的共享密钥 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 5. 启动前端

```bash
cd /opt/ai-xiaohongshu/frontend
INTERNAL_API_BASE_URL=http://127.0.0.1:8000 npm run start -- --hostname 127.0.0.1 --port 3000
```

### 6. 配置 Nginx

使用：

```text
infra/nginx/ai-xiaohongshu.conf.example
```

把你的域名指向前端即可。

## 推荐改为长期运行的方式

不建议手工开两个前台进程长期跑。

推荐使用：

1. `systemd` 管理前端
2. `systemd` 管理后端
3. `Nginx` 做统一入口

示例文件见：

1. `infra/systemd/ai-xiaohongshu-backend.service.example`
2. `infra/systemd/ai-xiaohongshu-frontend.service.example`

## 上线后优先验证的 URL

1. 前端首页：`https://你的域名/`
2. 任务中心：`https://你的域名/tasks`
3. 内容确认台：`https://你的域名/review`
4. 发布中心：`https://你的域名/dashboard`
5. 帖子列表：`https://你的域名/posts`
6. 后端健康检查：`https://你的域名/api/health`

## 上线后第一轮验收清单

### P0

1. 前端能正常打开
2. `/api/health` 正常返回
3. `/tasks`、`/review`、`/dashboard`、`/posts` 页面不报错
4. 已有 `published` 数据能在页面显示

### P1

1. QQ / OpenClaw 入站还能创建真实任务
2. `/review` 动作还能驱动状态流转
3. 真实发布成功案例对应帖子仍能在页面看到 `published` 和 `platformPostId`

### P2

1. 验证当前还缺的功能
2. 列出服务器环境下的新问题
3. 再决定补模型配置页、真实生图接入还是作品数据自动回收

## 当前不建议直接作为“已完整生产化”看待的原因

1. `infra/` 之前还是空骨架，这次只是补最小上线资产
2. 图片模型厂商配置页和真实厂商接入仍在后续任务中
3. 小红书作品点赞、收藏、评论的自动真实拉回还没有完全收口
4. OpenClaw 侧的长期稳定运行和登录态续期仍需要继续验证

## 当前最适合你的使用方式

当前最合理的方式不是一次性追求完整生产化，而是：

1. 先把整套系统放上服务器
2. 自己用真实路径测试
3. 把剩余缺口按服务器联调现象继续补齐

这正符合你现在的目标。
