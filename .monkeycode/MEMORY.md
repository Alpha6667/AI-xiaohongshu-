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

[前端视觉要求]
- Date: 2026-04-20
- Context: 用户要求前端除页面实现外还需承担 UI 设计，整体需要有高级感
- Instructions:
  - 前端开发除实现后台页面外，还需要负责 UI 设计工作。
  - 后台整体视觉应体现高级感，避免普通后台模板化观感。

[协作以 Git 文档为准]
- Date: 2026-04-20
- Context: 用户要求我直接给前后端分配任务并上传到 Git，让他们自行查看文档执行
- Instructions:
  - 前后端任务应直接写入仓库文档并推送到远程仓库。
  - 用户只需要让前后端查看文档，不再承担重复转述任务的工作。

[协调优先，不直接开发]
- Date: 2026-04-21
- Context: 用户明确要求我负责给前后端分配任务，而不是亲自做开发任务
- Instructions:
  - 我的主要职责是给前端和后端分配任务、协调边界、维护文档。
  - 在该项目中，默认不直接承担前后端实现工作，除非用户明确要求我亲自开发。

[中断后按小步推进]
- Date: 2026-04-21
- Context: 用户要求继续执行时，若不确定再提问；执行中断时按阶段推进而非整轮重做
- Instructions:
  - 如果后续步骤清晰，直接继续执行，不做无谓确认。
  - 只有在无法安全决策时，才提出澄清问题。
  - 出现中断时按小步骤续做并汇报当前进度，不整轮重做。

[第五轮第二段交付与回执格式]
- Date: 2026-04-21
- Context: 用户确认第五轮第一段后，要求继续执行第二段并在完成后提交 push
- Instructions:
  - 第五轮第二段需覆盖 publish 结果回写、指标快照追加写入、对应测试补充。
  - 完成后必须先提交并 push，再回复执行结果。
  - 回复中需明确给出 commit hash、接口或字段变更、测试点、未提交改动状态。

[前端工程验证与远程回归约束]
- Date: 2026-04-21
- Context: Agent 在执行第五轮前端依赖恢复、工程验证和真实回归时发现
- Category: 环境配置
- Instructions:
  - 前端当前使用 `npm` 流程；`frontend/package.json` 的 `lint` 和 `build` 已在本地恢复可用并通过。
  - Next 15 配置需使用 `allowedDevOrigins`，不能继续使用旧的 `allowedHosts` 写法。
  - 若后续需要做严格意义上的远程浏览器点击回归，前端客户端请求仍需要同源代理或明确可访问的后端地址。

[第五轮真实回归结论]
- Date: 2026-04-21
- Context: Agent 在执行第五轮项目收口与回归同步时发现
- Category: 测试方法
- Instructions:
  - 第五轮主链路已完成真实回归：生成、上传、发布成功、发布失败、指标历史展示、SSR 展示和后端重启后的持久化一致性均通过。
  - 当前未发现后端接口字段不一致、状态流转错误或服务重启后数据丢失问题。
  - 继续开发前可默认以“第五轮已闭环”作为起点，而不是重复回到持久化或联调阶段。

[第五轮联调待命策略]
- Date: 2026-04-21
- Context: 用户要求当前阶段以后端待命支持前端联调为主
- Instructions:
  - 当前不主动开启新任务。
  - 仅当前端在第五轮展示收口遇到字段、状态或返回结构问题时，再做小范围修正。
  - 修正后需同步更新相关文档。

[第五轮完成后持续待命边界]
- Date: 2026-04-21
- Context: 用户确认第五轮后端主任务已完成，后续进入联调与回归期
- Instructions:
  - 继续待命支持，不主动开启第六轮新功能开发。
  - 仅在前端环境验证、页面回归或服务重启验证发现字段、状态、持久化一致性问题时，进行小范围修正。
  - 修正后仍需同步更新协作文档与接口文档。

[依赖恢复阶段待命策略]
- Date: 2026-04-21
- Context: 用户要求在前端依赖恢复与工程验证阶段继续待命
- Instructions:
  - 当前继续待命，不开启任何新任务。
  - 仅当前端在依赖恢复和工程验证阶段暴露接口、状态或持久化问题时，提供小范围支持修正。

[前端构建闭环后待命策略]
- Date: 2026-04-21
- Context: 用户确认前端依赖、lint、build 已闭环，后续进入浏览器回归与重启一致性验证阶段
- Instructions:
  - 继续待命，不主动开启新任务。
  - 仅在前端浏览器端回归或服务重启后一致性验证暴露接口、状态或持久化问题时，再做小范围支持。

[第六轮后端执行约束]
- Date: 2026-04-22
- Context: 用户要求开始第六轮后端任务并聚焦 worker 自动回写和失败语义收口
- Instructions:
  - 本轮仅做第六轮后端任务，不扩新范围，不接真实小红书平台，不做大契约改名。
  - 必须交付 worker 自动发布回写、worker 自动指标追加、失败语义三分类与对应最小测试。
  - 完成后需更新 `backend.md` 同步区并提交 push，再回传 commit 与测试结果。

[测试环境最小补齐优先]
- Date: 2026-04-22
- Context: 用户要求先修复 backend 测试依赖，目标仅为跑通 `backend/tests/test_api_minimal.py`
- Instructions:
  - 仅做最小依赖补齐，不扩功能、不改 API 契约、不顺手重构。
  - 在 `backend/pyproject.toml` 增加测试依赖组并至少包含 `httpx>=0.27.0`。
  - 安装 backend 包及测试依赖后重跑 `python3 -m unittest tests.test_api_minimal`，并同步结果到 `backend.md`。

[产品原型方向确认]
- Date: 2026-04-22
- Context: 用户确认中文 HTML 原型方向正确，并要求继续细化
- Instructions:
  - 产品原型优先采用中文表达，避免英文技术后台感。
  - 页面应从运营视角组织信息，突出“今天该做什么、为什么做、下一步怎么做”。
  - 继续细化时应优先补内容流程、素材预览、手机预览、发布节奏等更贴近真实运营决策的区域。

[真实产品闭环目标]
- Date: 2026-04-22
- Context: 用户明确说明该项目希望直接服务自己的小红书账号日常发帖流程
- Instructions:
  - 产品原型应围绕“账号接入 -> 输入主题 -> AI 生成文案和图片 -> 人工挑选 -> OpenClaw 代发 -> 审核通过 -> 查看帖子和点赞数据”展开。
  - 页面重点不只是内容运营看板，还要明确体现账号接入、候选文案、候选图片、人工选择、OpenClaw 执行和发布结果回收。
  - 原型应尽量让非技术用户一眼看懂整个发帖闭环，而不是停留在抽象后台概念。

[正式后台与多页面原型优先]
- Date: 2026-04-22
- Context: 用户要求把产品原型继续细化成更像正式后台、真实可点击的多页面版本，并整理成前端重做指令
- Instructions:
  - 后续产品原型优先采用更正式的后台信息架构和页面层级，而不是单页概念展示。
  - 原型应拆成可点击的多页面版本，至少覆盖总览、发帖工作台、发布中心、帖子数据等核心页面。
  - 在完成原型后，需要同步产出一段可直接发给前端执行的页面重做指令。

[OpenClaw 对话优先与多账号运营]
- Date: 2026-04-22
- Context: 用户进一步明确真实使用方式应先通过 OpenClaw 发消息下达发帖需求，再回后台做选择和数据查看
- Instructions:
  - 产品应支持用户先向 OpenClaw 发送“今天要发什么”或“什么时候发什么”的消息，由 OpenClaw 返回候选文案和图片。
  - 后台主要承担确认选择、查看发布结果、查看数据和运营多个账号的作用，而不是唯一入口。
  - 产品结构应体现“消息入口 + 管理后台”双入口模式，并支持多个小红书账号同时运营。

[前端第七轮与第八轮衔接状态]
- Date: 2026-04-22
- Context: Agent 在编写前端下一轮任务文档时发现
- Category: 代码结构
- Instructions:
  - 前端第七轮已将 `/`、`/review`、`/dashboard`、`/posts` 重做为产品化页面，但当前导航和页面叙事仍以单账号工作台为主。
  - 第八轮需要在现有路由基础上新增 `tasks`、`accounts` 页面，并同步改造导航、首页、确认台、发布中心和帖子页的多账号视角。

[后端第七轮最小支撑方向]
- Date: 2026-04-22
- Context: Agent 在编写后端下一轮任务文档时发现
- Category: 代码结构
- Instructions:
  - 后端下一轮应优先补消息任务模型和多账号归属模型，为前端 `/tasks`、`/accounts` 和帖子账号归属视图提供稳定字段。
  - 本轮重点是最小接口与聚合返回，不扩真实消息同步、多账号调度、权限系统和真实平台接入。

[消息任务与多账号最小支撑]
- Date: 2026-04-22
- Context: 用户要求后端先提供最小数据结构和接口，支撑前端任务中心与多账号页接线
- Instructions:
  - 本轮优先补消息任务模型和多账号模型，覆盖阶段/状态与账号归属字段。
  - 优先提供最小接口（如 `GET /api/tasks`、`GET /api/accounts`）和最小测试，不扩真实平台接入、调度、权限系统。
  - 不破坏现有 `posts`、`dashboard`、`publish-result`、`metrics-snapshots` 链路和字段契约。

[任务与账号字段补口收口]
- Date: 2026-04-22
- Context: 用户要求下一轮以小补口为主，去掉前端回退推导逻辑
- Instructions:
  - `/api/tasks` 需稳定补齐 `stageLabel`、`nextAction`、`title`、`accountName` 与统一时间字段，并统一人工确认字段命名。
  - `/api/accounts` 需稳定返回 `todayTaskCount`、`waitingCount`、`publishedCount`、`totalEngagement`、`bestTopic`。
  - 保持边界：不扩真实聊天接入、多账号调度、权限系统，不破坏既有核心链路。

[今日进度与当前目标记录]
- Date: 2026-04-22
- Context: 用户要求记录今天的进度和当前最想要的产品方向
- Instructions:
  - 今天的重点成果是：前端已完成消息任务与多账号方向的页面重构，后端下一轮正式任务文档已建立并推送。
  - 当前最重要的产品目标仍然是“OpenClaw 对话入口优先”，后台承担任务确认、账号选择、发布结果查看和数据复盘。
  - 后续推进应继续围绕消息任务中心、多账号运营和最小后端支撑能力展开，而不是回退到单账号后台发帖思路。

[真实打通渠道与账号范围]
- Date: 2026-04-22
- Context: 用户说明 OpenClaw 可能运行在 QQ，如不可行可切到微信或飞书；多账号均为需要代运营的真实小红书账号
- Instructions:
  - 真实消息入口优先考虑 OpenClaw 所在聊天渠道，当前候选渠道为 QQ，备选为微信或飞书。
  - 小红书真实发布阶段需要优先研究可行的真实发布接口或可执行适配方式，而不是继续停留在演示接口层。
  - 多账号能力默认面向真实小红书账号，后续设计必须考虑真实账号凭证、状态、风控和归属管理。

[真实打通阶段决策]
- Date: 2026-04-22
- Context: 用户确认先尝试 QQ 接入，先调研小红书官方发布接口是否可满足需求，不满足再找其他方案；先只验证一个真实账号
- Instructions:
  - 真实消息入口第一优先级改为 QQ，微信和飞书保留为备选渠道。
  - 小红书真实发布方案先做官方接口可行性调研，若官方能力不足，再评估非官方或半自动方案。
  - 第一阶段只验证一个真实小红书账号，待单账号闭环稳定后再扩多账号。

[QQ 到后端任务优先打通]
- Date: 2026-04-22
- Context: 用户要求先做 QQ -> 后端任务接入，只验证消息能否稳定进入系统，暂不接小红书发布
- Instructions:
  - 当前真实打通的第一优先级是 QQ 消息接入到后端任务系统。
  - 这一阶段只验证消息接收、去重、落库、转任务和后台可见性，不碰小红书真实发布。
  - 后续真实发布和多账号扩展必须建立在这一步稳定之后。

[OpenClaw QQ 现状]
- Date: 2026-04-22
- Context: 用户说明当前 OpenClaw 已部署在腾讯云服务器并已接入 QQ bot，QQ 对话和回复已可正常工作
- Category: 环境配置
- Instructions:
  - 当前无需再验证 QQ bot 是否可用，真实接入的重点已转为 OpenClaw 服务如何把收到的 QQ 消息稳定转发给业务后端。
  - OpenClaw 当前运行在腾讯云服务器，后续设计需优先考虑服务到服务的 HTTP 回调或主动上报方式。

[QQ 消息入任务链路优先]
- Date: 2026-04-23
- Context: 用户要求本轮仅打通 OpenClaw QQ 消息进入后端并生成真实任务
- Instructions:
  - 当前轮次只做 QQ 消息接入到后端并生成真实 message task，不碰小红书发布和多账号调度。
  - 需要提供稳定消息接入口，包含来源校验、幂等去重、原始消息落库和任务创建。
  - 验收标准是 QQ 发一句话后，前端 `/tasks` 能看到真实任务。

[Backend 最小测试依赖前置条件]
- Date: 2026-04-23
- Context: Agent 在补跑 QQ 接入最小测试时发现
- Category: 测试方法
- Instructions:
  - 直接运行 `backend/tests/test_api_minimal.py` 前，需要先安装 backend 项目依赖，否则会在导入 `fastapi.testclient` 时失败。
  - 当前环境若未安装 backend 依赖，错误会表现为 `ModuleNotFoundError: No module named 'fastapi'`。
  - QQ 接入相关自动化验证前，应先完成 backend 依赖安装，再执行 `python3 -m unittest tests.test_api_minimal`。

[QQ 真实打通已完成]
- Date: 2026-04-24
- Context: Agent 在腾讯云服务器完成 OpenClaw QQ 转发到 backend 的真实验收后记录
- Category: 测试方法
- Instructions:
  - 当前已完成第一阶段真实闭环：`QQ -> OpenClaw -> backend -> /api/tasks`。
  - 已验证真实任务样例 `sourceMessage` 为 `QQ 发唯一测试消息`，任务阶段为 `pending_generation`。
  - 后续讨论不应再回到“QQ 是否可接入”，而应以上述真实闭环已成立为前提推进下一阶段。

[先做去重复验再做前端验收]
- Date: 2026-04-24
- Context: 用户要求在进入前端验收前，先确认 QQ 入站链路的幂等去重没有问题
- Instructions:
  - 下一步优先做 QQ 入站重复事件验证，确保同一个 `eventId` 不会创建重复任务。
  - 去重复验通过后，再进入前端 `/tasks` 页面真实验收。

[QQ 入站幂等去重已验证]
- Date: 2026-04-24
- Context: Agent 在腾讯云服务器完成 QQ 入站重复事件验证后记录
- Category: 测试方法
- Instructions:
  - 已验证固定 `eventId=qq_event_dedupe_20260424_1` 连续上报两次时，后端第一次返回 `duplicated=false`，第二次返回 `duplicated=true`。
  - 两次请求返回的 `messageTaskId` 相同，均为 `taskmsg_15128e20e1`。
  - `/api/tasks` 中仅存在一条 `sourceMessage` 为 `QQ 去重复验 20260424` 的任务，说明当前幂等去重正常。

[前端 Tasks 真实验收已通过]
- Date: 2026-04-24
- Context: Agent 在完成 `/tasks` 页面源码级验收后记录
- Category: 测试方法
- Instructions:
  - 已验证前端 `/tasks` 页面源码中包含真实任务 `QQ 发唯一测试消息`、`QQ 去重复验 20260424` 和状态文案 `待生成`。
  - 页面源码未命中“当前仍在使用展示层回退任务数据”，说明当前前端使用的是后端真实任务数据。
  - `QQ 去重复验 20260424` 在页面源码中仅出现 1 次，说明前端展示层去重结果正常。

[message task 承接 review]
- Date: 2026-04-24
- Context: 用户要求在 QQ 入站已打通基础上，补齐 message task 到 `/review` 的后端承接能力
- Instructions:
  - 真实 QQ 入站任务创建后，需要生成或关联可供 `/review` 使用的 `post`。
  - 必须保持 `messageTask.postId` 与 `post.messageTaskId` 双向关联一致。
  - 保持边界：不扩小红书真实发布、多账号自动分配、权限系统。
  - 需要补最小测试覆盖承接成功与幂等不重复建 post。

[Review 自动承接已打通]
- Date: 2026-04-24
- Context: Agent 在核对腾讯云部署版本和线上入站响应后记录
- Category: 测试方法
- Instructions:
  - 当前服务器部署版本已确认是 `9f457f4`，且线上 `POST /api/integrations/qq/messages` 会直接返回非空 `postId`。
  - 真实 QQ 入站任务已不再需要手动创建 `post`，可以自动承接到 `/review?postId=...`。
  - 后续推进不应再把“task 是否自动转成 post”视为待解决问题，而应继续验收 `/review` 页面动作链路。

[Review 页面动作验收已通过]
- Date: 2026-04-24
- Context: Agent 在完成 `/review` 页面真实动作验收后记录
- Category: 测试方法
- Instructions:
  - 已验证两条真实 QQ 任务都能承接到 `/review?postId=...`，并可执行保存确认版、提交人工确认、审核通过和审核退回动作。
  - 任务 A `post_f01d2157a6` 最终状态为 `approved`，任务 B `post_d61a46fec4` 最终状态为 `draft`。
  - 两条任务的 `reviewRecords` 都正确追加了两条记录，说明当前 `/review` 页面动作链路与后端状态回写正常。

[Dashboard 页面验收已通过]
- Date: 2026-04-24
- Context: Agent 在完成 `/dashboard` 页面源码级验收后记录
- Category: 测试方法
- Instructions:
  - 已验证 `/dashboard` 页面命中 `发布中心`、`OpenClaw`、`待发送`、`发送中`、`已发布`、`发送失败` 等真实状态关键词。
  - 任务 A `post_f01d2157a6` 当前在真实数据中为 `approved`，任务 B `post_d61a46fec4` 为 `draft`，与页面当前阶段展示一致。
  - 当前未命中失败分类关键词，是因为验收样本里没有失败发布记录，不应误判为页面问题。

[Posts 页面真实链路现状]
- Date: 2026-04-24
- Context: Agent 在执行 `/posts` 与 `/posts/[id]` 页面真实验收时发现
- Category: 代码模式
- Instructions:
  - `/posts` 列表页和 `/posts/[id]` 详情页当前都直连真实 `GET /api/posts` 与 `GET /api/posts/{id}`，不再是纯展示原型。
  - 当前 `/posts` 列表只展示 `status == published` 的帖子，因此未发布的真实 QQ 验收帖子不会自然进入列表。
  - 当真实 `post.accountId` 和 `task.accountId` 都为空时，前端详情页仍会回退到种子账号归属展示，这会影响多账号视角的真实性判断。

[真实入站账号归属收口]
- Date: 2026-04-24
- Context: 用户要求补齐 QQ/OpenClaw 真实入站任务与承接帖子账号归属，避免主路径出现空 accountId
- Instructions:
  - 真实 message task 创建时必须稳定写入 `accountId`，并通过 `/api/tasks` 返回对应 `accountName`。
  - 真实 post 创建或关联时必须稳定写入 `accountId`，且与任务归属一致。
  - 同一任务链路中需保持 `task.accountId`、`task.accountName`、`post.accountId`、`messageTask.postId`、`post.messageTaskId` 可互相对应。
  - 同一 `eventId` 重放不得写乱账号归属。
