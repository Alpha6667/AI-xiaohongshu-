# OpenClaw 故障复盘 2026-05-12

## 背景

本次故障发生在小红书 AI 发帖平台联调和真实发布验证期间。现场表现为 OpenClaw 看起来仍然在运行，但 `openclaw tui`、`openclaw terminal` 和 QQ 对话入口不稳定或不可用，导致控制链路中断，真实发布与 metrics 验证流程被迫暂停。

## 故障现象

现场出现了以下问题：

1. `openclaw tui` 启动后只显示欢迎语，无法正常交互。
2. `openclaw terminal --local --message` 启动异常或行为不稳定。
3. QQ 对话框不响应 `状态检查` 等简单消息。
4. OpenClaw 看起来像“进程还在，但功能挂了”。
5. 真实发布阶段一度出现 Chrome / Playwright 启动压力大、发布卡在 `publishing` 的情况。

## 根因分析

本次不是单一故障，而是多个问题叠加。

### 根因 1：qqbot 插件运行时缓存损坏

最关键的报错为：

```text
failed to load bundled channel qqbot: ENOTEMPTY: directory not empty, rmdir .../plugin-sdk
```

这说明 OpenClaw 在重建 bundled channel 的运行时依赖目录时，`plugin-sdk` 目录中存在残留文件，导致删除失败，最终造成 `qqbot` 通道加载异常。

直接影响：

1. QQ 通道无法正常加载。
2. `openclaw tui` / `openclaw terminal` 无法稳定进入可用状态。
3. 现场表现像 OpenClaw 整体挂掉。

### 根因 2：联调期间运行状态不一致

联调期间存在以下情况：

1. OpenClaw 旧进程和新进程混用。
2. mock 模式和真实模式切换频繁。
3. backend、frontend、OpenClaw 未必都运行在最新提交版本。
4. 某些服务重启了，某些没有重启。

这导致“代码已经修好，但运行中的并不是修好的那一版”，容易出现表面健康、实际链路不通的状态。

### 根因 3：后端持久化映射与重载逻辑不完整

此前 `repository.json` 已写入真实或 mock 数据，但 backend 重启后不能完整加载：

1. `platformPostId`
2. `metricsSource`
3. `latestMetrics.source`
4. `latestMetrics.capturedAt`
5. `metricsHistory[].source`
6. `metricsHistory[].capturedAt`
7. `lastSyncStatus`
8. `syncError`

原因是 repository 历史数据中存在 camelCase / snake_case 混用，backend 加载时未完全兼容。

直接影响：

1. 新 post 重启后 `GET /api/posts/{postId}` 可能返回 `404`。
2. metrics 已写入文件，但 API 返回看起来像“没保存”。
3. 容易误判为 OpenClaw 没抓到数据。

### 根因 4：2GB 服务器资源紧张

当前云服务器配置较低，联调期间需要同时承担：

1. backend / FastAPI
2. frontend / Next.js
3. OpenClaw server
4. gateway / qqbot
5. Playwright
6. Chromium
7. 小红书创作者中心页面

mock 模式通常可以承受，但真实发布或真实 metrics 抓取会显著提高资源压力。即使本次 `dmesg` 中没有明确 OOM 记录，2GB 配置仍然是高风险条件。

## 为什么今天恢复了

### 恢复点 1：重建了 OpenClaw runtime 缓存

我们没有触碰真实登录态目录，而是只处理了：

```text
/root/.openclaw/plugin-runtime-deps/
```

具体做法是备份并移走损坏的版本目录，让 OpenClaw 重新生成运行时依赖。

恢复效果：

1. `qqbot` 通道恢复加载。
2. `openclaw terminal` 恢复可用。
3. QQ 对话入口恢复。
4. OpenClaw 控制面恢复正常。

### 恢复点 2：后端补齐了 metrics 与持久化字段链路

后续修复覆盖了：

1. OpenClaw webhook 对接
2. metrics `source` / `capturedAt` 接入
3. repository reload 字段兼容
4. `latestMetrics` 与 `metricsHistory` 一致性

恢复效果：

1. 写入、重启、再读取链路闭合。
2. 后端可以稳定返回 metrics 来源和状态。
3. 前端能够按真实字段展示“真实数据 / 测试数据 / 抓取失败”。

### 恢复点 3：前端完成字段接入和页面收口

前端后续完成：

1. `/posts` 表格化展示
2. `/posts/[id]` metricsHistory 表格化展示
3. 数据来源展示
4. 默认隐藏开发 / 测试 / 联调类噪音数据
5. 页面文案简化

恢复效果：

1. 页面更接近运营后台。
2. 指标展示更容易人工验收。
3. mock 与真实数据来源可以区分。

### 恢复点 4：今天的联调顺序更受控

今天的执行顺序是：

1. 恢复 OpenClaw 控制面
2. 跑 mock 全链路
3. 修后端持久化与字段映射
4. 做真实发布预热
5. 再尝试真实发布 / 真实 metrics 验证

这种顺序减少了“边修边发边切策略”的混乱状态。

## 本次真实发布结论

本次已经证明：

1. OpenClaw 能使用真实 profile 进入小红书创作者中心。
2. 登录态有效，预热成功。
3. 能完成真实图片上传、标题填写、正文填写和点击发布。
4. 能拿到真实 `platformPostId`。
5. 创作者中心 metrics API 可读。

当前剩余重点不再是“能不能发”，而是：

1. 真实 metrics 回写到 backend 后是否完整落库。
2. frontend 是否准确展示“真实数据”。
3. source 命名是否统一为 `xhs_creator_center`。

## 现场恢复手册要点

若再次出现以下现象：

1. `openclaw tui` / `terminal` 只有欢迎语
2. QQ 不响应
3. 日志出现 `ENOTEMPTY` 与 `plugin-sdk`

优先处理：

```text
/root/.openclaw/plugin-runtime-deps/
```

不要先处理：

```text
/root/.openclaw/xhs-profile-persist
```

因为后者是小红书真实登录态目录，不属于本次故障根因。

## 后续建议

1. 云服务器建议升级到 4GB 内存以上，以降低真实发布和真实 metrics 抓取时的资源风险。
2. 真实发布前固定先做 session 预热。
3. 每次真实发布前确认目标 post 不是已发布状态，避免重复发帖。
4. OpenClaw 与 backend 的 metrics source 命名固定为：

```text
xhs_creator_center
```

5. 真实发布建议每天最多 2 条，降低平台风控风险。

## 一句话总结

本次故障的核心原因是 `qqbot` 插件运行时缓存损坏叠加联调状态不一致；今天恢复的关键是重建了 OpenClaw runtime 缓存，并补齐了 backend 的持久化与 metrics 字段链路。
