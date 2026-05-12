# 2026-05-12 技术负责人交接文档

## 我的职责定位

本项目中，技术负责人负责拆解任务、定义契约、审查结果、协调前端/后端/OpenClaw 边界、把关键结论写入 Git 文档。默认不直接接管前端、后端或 OpenClaw 的实现，除非用户明确要求。

## 本阶段完成的协调工作

1. 将前端、后端、OpenClaw 三方职责边界写入 `TEAM_COLLABORATION_RULES.md`。
2. 将真实发布安全流程写入 `REAL_PUBLISH_RUNBOOK.md`。
3. 将登录态保护流程写入 `XHS_LOGIN_STATE_RUNBOOK.md`。
4. 将发布、素材、metrics、人工验证和前端验收写入 `PUBLISH_VERIFICATION_LOG.md`。
5. 推动前端完成信息架构清爽化改版。
6. 推动后端完成素材代理接口和人工验证错误码保存。
7. 推动 OpenClaw 完成发布持久化、captcha 安全识别和 metrics 恢复验收。
8. 将协作规则固化为“所有跨角色上下文必须通过 Git 同步”。

## 关键判断

1. 项目已经具备真实小红书图文发布能力。
2. 项目已经具备真实 metrics 抓取与前端展示能力。
3. 素材图片展示问题已通过后端代理接口解决。
4. `page_structure_changed` 在本次问题中是误判，真实原因是小红书人工验证页。
5. 自动绕过 captcha 或平台风控不可接受，正确策略是检测并安全失败。
6. `post_needs_manual_verification` 已成为合法错误码，并已完成 OpenClaw、后端、前端链路收口。
7. 生产页面未更新时，应优先检查服务器是否拉取最新分支、重新 build、重启前端服务和清理缓存。

## 当前全链路状态

```text
前端 UI 改版：通过
后端素材接口：通过
OpenClaw captcha 安全识别：通过
后端人工验证错误码保存：通过
前端人工验证文案展示：通过
人工验证后 refresh-metrics 恢复：通过
```

## 必须继续坚持的边界

1. 真实发布必须经用户明确授权。
2. 没有真实 `platformPostId` 不能标记 `published`。
3. 禁止写入模拟 `platformPostId`。
4. `publishing` 状态下禁止二次触发发布。
5. 发布失败或超时后必须先查创作者中心。
6. 禁止手工改生产 `repository.json`。
7. 禁止提交 `.env`、token、Cookies、Chrome profile、截图。
8. 禁止绕过 captcha、人机验证或平台风控。
9. 每次跨角色变更都要提交并 push 到 Git。

## 如何继续协调

1. 让三方先同步 `260509-chore-add-final-archive`。
2. 每个新任务先明确 owner：前端、后端、OpenClaw 或技术负责人。
3. 每个 owner 完成后必须返回 commit hash、测试结果、git status。
4. 技术负责人只把已验收事实写入文档，不把未验证猜测写成结论。
5. 需要真实发布或触发平台操作时，先让用户明确授权。

## 下一步建议

1. 先完成生产前端更新、重启和浏览器验收。
2. 再处理剩余低优先级验收项：SSR 缓存、二次发布防护、无 noteId 展示状态。
3. 再进入产品优化：告警、任务流、账号健康、失败恢复。
4. 最后规划视频发布第二阶段。
