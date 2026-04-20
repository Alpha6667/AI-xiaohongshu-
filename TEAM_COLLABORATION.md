# 团队协作说明

本文件用于统一本项目中负责人与开发协作方式，减少重复转述和信息丢失。

## 协作目标

- 所有人围绕同一个 Git 仓库协作
- 所有人围绕同一套需求、设计、任务和同步文档工作
- 减少负责人在人与人之间转发任务的成本
- 保证前端、后端、协调方始终读取同一份最新信息

## 统一工作原则

1. 不通过聊天反复转述任务
2. 所有任务、边界、同步信息都以仓库文件为准
3. 每位开发只维护自己负责的同步文件
4. 有问题先写入协作文档，再由协调方统一处理
5. 所有人优先读取文档，不依赖口头记忆

## 当前使用的分支

- 协作分支：`260420-chore-plan-first-iteration`

如果后续切换分支，应由负责人统一通知，并保持前后端在同一分支协作。

## 必看文件

### 1. 需求与设计

- `.monkeycode/specs/2026-04-20-xiaohongshu-ai-posting-platform/requirements.md`
- `.monkeycode/specs/2026-04-20-xiaohongshu-ai-posting-platform/design.md`

作用：

- 说明系统要做什么
- 说明系统怎么设计
- 说明模块边界与核心数据模型

### 2. 实施任务清单

- `.monkeycode/specs/2026-04-20-xiaohongshu-ai-posting-platform/tasklist.md`

作用：

- 说明当前开发阶段的正式任务顺序
- 说明哪些任务优先做
- 说明哪些任务是可选测试任务

本轮先看：

- 前端：重点看 `tasklist.md` 顶部“当前迭代分工”与 `frontend.md`
- 后端：重点看 `tasklist.md` 顶部“当前迭代分工”与 `backend.md`

### 3. 协作同步文件

- `.monkeycode/team-context/architecture.md`
- `.monkeycode/team-context/frontend.md`
- `.monkeycode/team-context/backend.md`
- `.monkeycode/team-context/daily-sync.md`

作用：

- `architecture.md`
  - 记录全局架构边界与当前协作分工
- `frontend.md`
  - 前端开发写进度、问题、协作需求
- `backend.md`
  - 后端开发写进度、问题、协作需求
- `daily-sync.md`
  - 汇总每天的重要同步结果

## 角色职责

### 负责人

负责人只需要做以下事情：

- 确认优先级
- 确认是否变更范围
- 提醒大家查看统一文档
- 在必要时决定下一阶段目标

负责人不需要重复复制粘贴长任务说明给每个人。

### 协调方

协调方负责：

- 维护任务拆解
- 维护协作边界
- 根据同步文件继续调度工作
- 识别前后端接口冲突和优先级问题

### 前端开发

前端开发负责：

- 阅读 `tasklist.md` 和 `frontend.md`
- 按当前任务实现后台页面与 UI
- 每次开发后更新 `frontend.md`

### 后端开发

后端开发负责：

- 阅读 `tasklist.md` 和 `backend.md`
- 按当前任务实现数据模型、API 和任务入口
- 每次开发后更新 `backend.md`

## 固定同步方式

每位开发每次完成一轮工作后，都必须更新自己的同步文件，并使用以下格式：

```markdown
## 已完成
- ...

## 当前问题
- ...

## 需要协作
- ...

## 下一步
- ...
```

说明：

- `已完成`：当前已经落地的代码或文件
- `当前问题`：当前卡住或不确定的问题
- `需要协作`：需要前端、后端或协调方确认的事项
- `下一步`：准备继续做的内容

## 推荐工作流

### 前端开发工作流

1. 先读 `tasklist.md`
2. 再读 `frontend.md`
3. 在自己的模块内开发
4. 开发完成后更新 `frontend.md`
5. 如需接口确认，在 `需要协作` 中写明

### 后端开发工作流

1. 先读 `tasklist.md`
2. 再读 `backend.md`
3. 在自己的模块内开发
4. 开发完成后更新 `backend.md`
5. 如需前端配合，在 `需要协作` 中写明

### 协调工作流

协调方只需要：

1. 读取 `frontend.md`、`backend.md`、`daily-sync.md`
2. 根据当前进度判断下一步优先级
3. 更新 `architecture.md`、`tasklist.md` 或其他协作文档

## 禁止事项

- 不要各自依据聊天记录理解任务
- 不要跳过 `tasklist.md` 直接随意扩展范围
- 不要让负责人做人肉传话筒
- 不要在未同步的情况下修改公共边界
- 不要前后端各自定义不同字段名称

## 一句话执行规则

- 任务看 `tasklist.md`
- 架构边界看 `architecture.md`
- 前端进度看 `frontend.md`
- 后端进度看 `backend.md`
- 每日汇总看 `daily-sync.md`

只要所有人遵守这套规则，负责人就不需要反复在不同开发之间手动转发任务。

## 现在直接怎么通知开发

你可以直接这样告诉他们：

- 前端开发：请拉取最新分支，阅读 `.monkeycode/specs/2026-04-20-xiaohongshu-ai-posting-platform/tasklist.md` 顶部的当前迭代分工，以及 `.monkeycode/team-context/frontend.md`，按文档直接开发并在完成后更新同步区。
- 后端开发：请拉取最新分支，阅读 `.monkeycode/specs/2026-04-20-xiaohongshu-ai-posting-platform/tasklist.md` 顶部的当前迭代分工，以及 `.monkeycode/team-context/backend.md`，按文档直接开发并在完成后更新同步区。
