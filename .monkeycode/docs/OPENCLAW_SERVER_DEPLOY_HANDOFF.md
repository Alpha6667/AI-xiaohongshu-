# 发给 OpenClaw 的服务器部署交接文案

请在服务器上完成这个项目的最小上线部署，目标是让我可以直接通过域名访问前端页面，并继续做真实联调测试。

## 仓库与分支

1. 仓库目录建议放到：`/opt/ai-xiaohongshu`
2. 拉取并切换到分支：`260420-chore-plan-first-iteration`

## 必看文件

1. `.monkeycode/docs/SERVER_MINIMAL_DEPLOYMENT.md`
2. `infra/nginx/ai-xiaohongshu.conf.example`
3. `infra/systemd/ai-xiaohongshu-backend.service.example`
4. `infra/systemd/ai-xiaohongshu-frontend.service.example`
5. `scripts/server/setup-frontend.sh`
6. `scripts/server/setup-backend.sh`

## 这次部署的目标

1. 前端运行在 `127.0.0.1:3000`
2. 后端运行在 `127.0.0.1:8000`
3. Nginx 对外暴露我的域名
4. 前端通过同域名下的 `/api` 访问后端
5. 完成后我能打开：
   - `/`
   - `/tasks`
   - `/review`
   - `/dashboard`
   - `/posts`
   - `/api/health`

## 当前部署边界

1. 不要求这次顺手补图片模型 API 接入
2. 不要求这次顺手补小红书点赞收藏评论的自动真实拉回
3. 这次重点只是把当前已经有的前后端能力上线到服务器上，便于我继续测试和找缺口

## 你需要完成的事情

1. 拉代码并安装依赖
2. 构建前端
3. 创建后端虚拟环境并安装依赖
4. 配置最小环境变量
5. 用 systemd 管理前后端进程
6. 配置 Nginx 反向代理
7. 返回给我：
   - 实际部署目录
   - 实际域名
   - 前端服务状态
   - 后端服务状态
   - `api/health` 结果
   - 还存在哪些报错或未闭环功能

## 必须注意

1. 当前后端主持久化是 `backend/data/repository.json`，不要误以为必须先接 PostgreSQL 才能跑起来
2. 不要因为排障去重启会影响现有 OpenClaw 主链路的服务
3. 若遇到反向代理问题，优先保证前端可访问和 `/api/health` 可用

## 完成后回传格式

1. 部署目录
2. 域名
3. 前端访问结果
4. `/api/health` 返回
5. 前端 systemd 状态
6. 后端 systemd 状态
7. 当前还缺的功能清单
