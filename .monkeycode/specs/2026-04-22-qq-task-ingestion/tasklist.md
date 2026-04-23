# 需求实施计划

- [x] 1. 为 QQ 入站消息增加最小数据模型与 schema
  - 新增原始消息模型，覆盖 `source`、`senderId`、`conversationId`、`content`、`sentAt`、`receivedAt`、`dedupeKey`、`processingStatus`
  - 新增 QQ 入站请求 schema 和最小响应 schema，保证字段校验明确
  - 为消息任务补充与入站消息关联所需字段，保持与现有 `/api/tasks` 返回兼容

- [x] 2. 实现 QQ 入站消息接收与去重服务
  - 新增 `POST /api/integrations/qq/messages` 路由和 service
  - 实现最小签名或共享密钥校验
  - 实现基于 `eventId` 或 `dedupeKey` 的幂等去重
  - 合法消息入站后保存原始消息，不触发小红书发布
  - [x]* 2.1 为签名校验和去重逻辑补单元测试

- [x] 3. 实现原始消息转 Message Task 的服务逻辑
  - 从原始消息生成 `title`、`topic`、`stage`、`stageLabel`、`nextAction`、`requestedAt`、`plannedAt`
  - 在第一阶段使用保守默认规则创建任务，不依赖小红书发布和多账号调度
  - 确保同一条消息不会重复创建多条任务
  - [x]* 3.1 为任务构造默认规则补单元测试

- [x] 4. 让 `/api/tasks` 优先返回真实入站任务
  - 调整任务查询服务，优先输出来自真实 QQ 消息的任务记录
  - 保持前端当前依赖字段稳定，不破坏已存在页面
  - 若真实任务为空，保持现有最小兼容策略
  - [x]* 4.1 为真实任务优先级补接口测试

- [ ] 5. 检查点 - 确保所有测试通过
  - 确保所有测试通过,如有疑问请询问用户
  - 当前代码层面的最小自动化测试已经补入，但本地执行 `python3 -m unittest tests.test_api_minimal` 时因环境未安装 `fastapi` 失败，需先安装 backend 依赖后再补跑

- [x] 6. 更新契约与协作文档
  - 在 `.monkeycode/docs/API_CONTRACT.md` 记录 QQ 入站接口和任务字段来源
  - 在 `.monkeycode/team-context/backend.md` 同步本轮实现结果和已知边界
  - 明确第一阶段只验证 QQ 消息进入系统，不包含小红书真实发布

- [ ] 7. 补最小自动化测试并完成验证
  - 扩展 `backend/tests/test_api_minimal.py` 或新增最小测试文件，覆盖合法接收、重复接收、非法签名和任务可查询
  - 运行现有后端最小测试与仓储测试，确认本轮改动未破坏既有链路
  - 当前已补 `test_qq_message_ingestion_creates_real_task_and_deduplicates`，但本地尚未完成依赖安装后的补跑验证
  - [ ]* 7.1 为异常恢复状态补更细粒度测试
