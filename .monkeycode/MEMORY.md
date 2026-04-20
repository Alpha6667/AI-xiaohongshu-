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
