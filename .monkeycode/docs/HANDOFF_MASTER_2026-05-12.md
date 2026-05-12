# 2026-05-12 项目总交接文档

## 当前结论

截至 2026-05-12，项目已经完成小红书真实图文自动发布、真实 metrics 抓取、前端数据展示、素材图片代理展示、人工验证错误链路收口和团队协作文档沉淀。

当前交付分支：

```text
260509-chore-add-final-archive
```

最新已知收口提交：

```text
21f409a docs: record metrics recovery verification
```

## 新模型启动顺序

任何新模型、协作者或维护者接手时，先执行：

```bash
git fetch origin
git checkout 260509-chore-add-final-archive
git pull origin 260509-chore-add-final-archive
```

然后按顺序读取：

```text
.monkeycode/MEMORY.md
.monkeycode/docs/HANDOFF_MASTER_2026-05-12.md
.monkeycode/docs/HANDOFF_FRONTEND_2026-05-12.md
.monkeycode/docs/HANDOFF_BACKEND_2026-05-12.md
.monkeycode/docs/HANDOFF_OPENCLAW_2026-05-12.md
.monkeycode/docs/HANDOFF_TECH_LEAD_2026-05-12.md
.monkeycode/docs/NEXT_OPTIMIZATION_PLAN_2026-05-12.md
.monkeycode/docs/TEAM_COLLABORATION_RULES.md
.monkeycode/docs/REAL_PUBLISH_RUNBOOK.md
.monkeycode/docs/XHS_LOGIN_STATE_RUNBOOK.md
.monkeycode/docs/PUBLISH_VERIFICATION_LOG.md
```

## 已打通能力

1. QQ/OpenClaw 消息进入后端任务系统。
2. 后台可查看消息任务、账号运营、发布中心、帖子详情和数据表现。
3. OpenClaw 可使用真实小红书登录态自动发布图文笔记。
4. 后端可保存真实 `platformPostId`、发布状态、metrics 和错误状态。
5. 前端可展示真实发布状态、`platformPostId`、素材、metrics、数据来源和同步错误。
6. 后端通过 `/api/assets/{assetId}/content` 代理本地素材给浏览器访问。
7. OpenClaw 可识别小红书 captcha / 人工验证状态，并安全停止 metrics 抓取。
8. 人工验证完成后，`refresh-metrics` 已复验恢复成功。

## 关键真实验收对象

真实发布帖子：

```text
postId = post_9100f36d13
platformPostId = 6a026a40000000003600289d
title = 「永失吾爱·破败之影」——佛耶戈的孤寂与宿命
assetId = asset_3876dcbec3
source = xhs_creator_center
```

素材代理：

```text
/api/assets/asset_3876dcbec3/content
```

## 关键提交

```text
e565754 fix: serve local asset content via API
effb44b feat(frontend): streamline dashboard information architecture
ed73c8c fix: accurate captcha detection for metrics without bypass attempts
b5ec642 fix: accept manual verification metrics error
d9677dc fix: show manual verification metrics state
21f409a docs: record metrics recovery verification
```

## 当前剩余事项

1. 确认生产前端已拉取最新代码、重新 build 并重启服务。
2. 清理或刷新 SSR/浏览器缓存，确认帖子详情页不再显示旧的“素材加载失败”。
3. 继续验证已发布帖子不会二次发布。
4. 继续验证无真实 `platformPostId` 的帖子不会显示为已发布。
5. 视频发布保持第二阶段规划。
6. 根据真实使用情况优化任务确认、账号健康、发布失败处理和告警。

## 协作规则

1. 前端、后端、OpenClaw 和技术负责人不在同一台服务器上，所有上下文必须通过 Git 同步。
2. 每次完成代码或文档更改后，必须提交并在需要协作时 push 到共享远程分支。
3. 提交必须控制范围，避免混入无关改动。
4. 禁止提交 `.env`、token、Cookies、Chrome profile、截图、生产 `repository.json`。
5. 真实发布必须经用户明确授权。
6. 禁止伪造 `platformPostId`。
7. 遇到 captcha / 人工验证时，只允许检测并安全失败，禁止绕过验证码或平台风控。
