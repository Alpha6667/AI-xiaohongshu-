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

## 2026-04-30 增量同步执行单

这部分用于当前服务器已经跑起来、但需要把主协作线最新前端正式同步到线上时直接执行。

### 当前目标

1. 服务器部署目录保持不变：`/srv/AI-xiaohongshu-`
2. 目标分支：`260420-chore-plan-first-iteration`
3. 目标结果：线上前端包含帖子页收口和网页内 `refresh-metrics` 按钮
4. 远端主协作线已经包含这次前端改动，不需要保留服务器本地旧手改版本

### 当前已确认的目标提交

1. 前端功能提交：`f7a1b8fdeea5c6242a214a5864fb845827a92e2b`
2. 主协作线合并提交：`a50783b82cd5d950c0f9e71f19268336d48ca87b`

### 允许直接丢弃的服务器本地改动

如果服务器本地正是这两处手动改动阻塞 `git pull`，允许直接丢弃，不保留本地版本：

1. `frontend/src/app/posts/[id]/page.tsx`
2. `frontend/src/styles/globals.css`

### 执行边界

1. 只做“同步远端主协作线 -> 构建前端 -> 重启前端服务 -> 验证网页”这条链路
2. 不要顺手改代码
3. 不要新建 commit
4. 不要 push
5. 如果任一步失败，立即停止并回传失败点，不要自动修复或临时改文件
6. 不要重启会影响现网 OpenClaw 会话链路的主服务

### 建议执行步骤

```bash
# 进入部署仓库
cd /srv/AI-xiaohongshu-

# 确认当前分支和本地改动
git status --short --branch

# 如果阻塞 pull 的正是这两个前端文件，直接丢弃它们的本地改动
git restore -- "frontend/src/app/posts/[id]/page.tsx" "frontend/src/styles/globals.css"

# 拉取主协作线最新代码
git pull --ff-only origin 260420-chore-plan-first-iteration

# 记录当前同步后的提交
git rev-parse HEAD

# 重新构建前端
cd frontend && npm install && npm run build

# 重启前端服务
systemctl restart ai-xiaohongshu-frontend

# 检查前端服务状态
systemctl status ai-xiaohongshu-frontend --no-pager
```

### 页面验证要求

至少验证以下几点：

1. `/posts` 页面能打开，并能看到“刷新最新数据”按钮
2. `/posts/post_e4c2534c7a` 页面能打开
3. 详情页中存在 metrics 刷新按钮
4. 点击刷新后，请求成功，且页面能看到最新 `latestMetrics` 或 `metricsHistory` 变化

### 回传格式

请严格按下面格式回传，避免遗漏关键信息：

1. 当前 `HEAD`
2. `git status --short --branch` 结果
3. 前端构建结果
4. `systemctl status ai-xiaohongshu-frontend --no-pager` 结果
5. `/posts` 页面验证结果
6. `/posts/post_e4c2534c7a` 页面验证结果
7. 点击刷新 metrics 后的结果
8. 若失败，失败步骤和原始报错
