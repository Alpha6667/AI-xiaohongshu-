# 用户指令记忆

本文件记录了用户的指令、偏好和教导，用于在未来的交互中提供参考。

## 格式

### 用户指令条目
用户指令条目应遵循以下格式：

[用户指令摘要]
- Date: [YYYY-MM-DD]
- Context: [提及的场景或时间]
- Instructions:
  - [用户教导或指示的内容，逐行描述]

### 项目知识条目
Agent 在任务执行过程中发现的条目应遵循以下格式：

[项目知识摘要]
- Date: [YYYY-MM-DD]
- Context: Agent 在执行 [具体任务描述] 时发现
- Category: [代码结构|代码模式|代码生成|构建方法|测试方法|依赖关系|环境配置]
- Instructions:
  - [具体的知识点，逐行描述]

## 条目

[项目初始化骨架]
- Date: 2026-04-20
- Context: Agent 在初始化小红书 AI 发帖平台仓库结构时发现
- Category: 代码结构
- Instructions:
  - 仓库采用单仓结构，包含 `frontend`、`backend`、`worker`、`shared`、`infra` 和 `.monkeycode` 目录。
  - 前端使用 `Next.js`，后端使用 `FastAPI`，异步任务单独放在 `worker` 目录。

[项目开发命令]
- Date: 2026-05-09
- Context: Agent 在评估当前项目能力时发现
- Category: 构建方法
- Instructions:
  - 根目录 `package.json` 声明 `packageManager` 为 `pnpm@10.8.1`，前端相关命令应优先使用 `pnpm --dir frontend ...`。
  - 当前根目录脚本包含 `pnpm dev:frontend` 和 `pnpm lint:frontend`，后端本地启动命令记录在 README 中为 `uvicorn app.main:app --reload`。

[技术负责人协作角色]
- Date: 2026-05-09
- Context: 用户明确安排我担任本项目技术负责人，并会安排前端和后端配合
- Instructions:
  - 后续围绕本项目按技术负责人角色工作，负责技术判断、任务拆解、前后端协作边界、代码质量审查和交付收口。
  - 与用户安排的前端和后端人员协作时，优先输出清晰的接口契约、验收标准、风险点和下一步执行指令。
  - 技术负责人角色以发出任务指令、定义验收标准、审查结果和推进协作为主，具体代码实现交给前端、后端和 OpenClaw 执行。

[共享 Git 交付规则]
- Date: 2026-05-12
- Context: 用户要求每次更改都提交到 Git，方便前端、后端、OpenClaw 和技术负责人四方同步文档与代码
- Instructions:
  - 后续完成代码或文档更改后，应及时提交到 Git，并在需要协作同步时 push 到共享远程分支。
  - 提交范围必须清晰，避免混入无关改动、密钥、Cookies、Chrome profile、截图和环境文件。
  - 跨角色协作文档应优先进入 Git，确保不同服务器上的协作者都能通过仓库获取最新上下文。
