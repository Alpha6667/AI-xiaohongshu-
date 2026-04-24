# 小红书登录态策略后端执行任务单

## 适用文档

本任务单承接：

1. `.monkeycode/docs/XHS_LOGIN_STATE_STRATEGY.md`
2. `.monkeycode/docs/XHS_DATA_SYNC_PRODUCT_FLOW.md`
3. `.monkeycode/docs/PRODUCT_FLOW_OPENCLAW_TO_XHS.md`

## 目标

让后端能够明确表达“小红书账号是否已接入、当前登录态是否有效、何时需要重新登录、何时允许发布和拉数”，并为前端与 OpenClaw 提供稳定接口。

## 后端当前已具备的基础

1. 已有账号对象和最小账号聚合接口基础。
2. 已有帖子与发布回写链路基础。
3. 已有 OpenClaw webhook 与异步回写链路基础。

## 本轮必须交付

### 1. 增加账号接入状态字段

为账号实体或等价聚合层增加至少以下字段：

1. `connectionStatus`
2. `reauthRequired`
3. `connectedAt`
4. `lastValidatedAt`
5. `lastUsedAt`
6. `lastAuthError`
7. `loginStateRef` 或等价引用字段

### 2. 定义稳定状态语义

至少统一以下状态：

1. `connected`
2. `reauth_required`
3. `disconnected`
4. `validating`

要求：

1. 前端和 OpenClaw 都能消费同一套状态语义。
2. 不把浏览器内部细节直接暴露给前端。

### 3. 提供账号接入状态接口

至少保证以下能力之一：

1. 在现有 `GET /api/accounts` 中补齐登录态字段。
2. 或新增轻量接口返回账号接入信息。

接口返回至少应包含：

1. 账号标识
2. 当前接入状态
3. 是否需要重新登录
4. 最近一次验证时间
5. 最近一次认证错误摘要

### 4. 提供 OpenClaw 登录态回写接口

用于接收 OpenClaw 对登录态的更新结果，至少支持：

1. 首次接入成功
2. 登录态验证成功
3. 登录态失效
4. 重新连接成功

回写后要求：

1. 账号状态立即更新。
2. 前端读取时能看到最新状态。

### 5. 约束发布与拉数前置条件

要求后端在触发以下动作前检查账号状态：

1. 真实发布
2. 真实拉数

若账号状态为 `reauth_required` 或 `disconnected`：

1. 拒绝执行动作。
2. 返回明确错误语义。
3. 不允许继续写假成功状态。

### 6. 区分认证失败与发布失败

要求：

1. 登录态失效属于账号接入问题，不应直接归类为 `publish_failed`。
2. 数据同步因未登录失败时，也不应写成发布失败。
3. 应返回独立错误原因，供前端和 OpenClaw 明确提示“需要重新登录小红书”。

### 7. 更新契约与测试

必须同步：

1. 更新 `.monkeycode/docs/API_CONTRACT.md`
2. 补最小测试覆盖：
   - 账号接入状态字段返回
   - 登录态回写更新状态
   - `reauth_required` 时拒绝发布
   - `reauth_required` 时拒绝拉数

## 本轮不要做

1. 不负责浏览器脚本实现细节。
2. 不负责前端接入页 UI。
3. 不负责 QQ 提醒文案设计。

## 完成标准

当以下条件成立时，可认为后端侧任务完成：

1. 前端能稳定读到账号接入状态与最近验证结果。
2. OpenClaw 能稳定回写登录态状态。
3. 登录态失效时，后端会阻止真实发布与真实拉数。
4. 登录态问题与发布问题、拉数问题已明确区分。
