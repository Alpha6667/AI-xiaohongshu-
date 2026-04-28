# OpenClaw DeepSeek V4 故障排查记录

## 背景

本次目标原本是把 OpenClaw 的默认模型切到 DeepSeek V4 系列，优先尝试：

1. `deepseek/deepseek-v4-flash`
2. `deepseek/deepseek-v4-pro`

但在实际会话中，`/model` 切换到 V4 后，OpenClaw 会在后续对话时报错：

```text
400 The `reasoning_content` in the thinking mode must be passed back to the API.
```

这个问题一度被误判为：

1. DeepSeek API Key 配置错误
2. OpenClaw 版本过旧
3. `openclaw.json` 中 `reasoning: true/false` 设置不对
4. 当前会话没有切到正确模型

后续排查确认，上述都不是根因。

## 最终结论

根因不是配置文件本身，而是 OpenClaw 当前使用的 `openai-completions` 适配层会把 DeepSeek V4 返回的 `reasoning_content` 当作内部 `thinking` 内容处理。

具体表现是：

1. DeepSeek V4 Flash / Pro 在流式返回中会带 `reasoning_content`
2. OpenClaw 流式解析代码会把 `reasoning_content` / `reasoning` / `reasoning_text` 识别成 `thinking` block
3. 后续组装 assistant message 时，又会触发 `reasoning_content` 相关续传逻辑
4. DeepSeek API 认为当前已进入 thinking mode，要求客户端把 `reasoning_content` 原样带回
5. OpenClaw 没有按 DeepSeek 的要求正确续传，所以后续请求直接 400

因此：

1. 这不是 `reasoning: false` 就能解决的问题
2. 这也不是单纯更新 `openclaw.json` 能解决的问题
3. 这是 OpenClaw 当前对 DeepSeek V4 `reasoning_content` 的流式兼容问题

## 为什么一开始会失败

### 1. 默认模型和当前 agent 模型不一致

当时配置里出现过：

1. `agents.defaults.model.primary = deepseek/deepseek-v4-flash`
2. `agents.list[0].model = deepseek/deepseek-chat`

这会导致：

1. 配置看上去已经切到 V4
2. 但当前 `main` agent 实际仍可能继续用 `deepseek-chat`
3. 判断模型是否真正切换容易混乱

### 2. 旧 session 会保留历史模型和上下文

OpenClaw 的旧会话不会因为改了默认模型就自动迁移。

所以会出现：

1. 配置已切到 V4
2. 当前旧 session 仍使用旧模型
3. 甚至即使模型名显示已切换，旧 thinking 上下文仍可能污染后续请求

### 3. 实际生效的包路径一开始找错了

最初按常规 Node 全局安装路径排查：

`/root/.nvm/versions/node/v22.22.0/lib/node_modules/openclaw`

但实际命令入口是：

`/root/.local/share/pnpm/openclaw`

其真实执行文件是：

`/root/.local/share/pnpm/global/5/.pnpm/openclaw@2026.4.24/node_modules/openclaw/openclaw.mjs`

因此真正需要修补的依赖文件不在前面猜测的路径，而在 pnpm 全局目录下。

### 4. systemd 服务名也和最初假设不同

最初假设存在统一的 `openclaw-gateway.service`，但服务器上实际明确存在的是：

`openclaw-xhs-publisher.service`

而这个服务只是小红书发布 webhook：

1. `WorkingDirectory=/root/.openclaw/workspace/skills/xiaohongshu-publisher`
2. `ExecStart=/root/.nvm/versions/node/v22.22.0/bin/node server.js`

它不是当前 `tui` / `agent` 会话的主进程，所以不应再用它来判断聊天模型是否生效。

## 关键定位过程

### 1. 确认真正生效的 OpenClaw 入口

通过以下命令确认：

```bash
which openclaw
cat /root/.nvm/versions/node/v22.22.0/bin/openclaw
cat /root/.local/share/pnpm/openclaw
```

最终确认：

1. `openclaw` 命令只是 shell 包装
2. 真正执行的是 pnpm 全局包

### 2. 确认关键源码文件

最终锁定文件：

`/root/.local/share/pnpm/global/5/.pnpm/openclaw@2026.4.24/node_modules/@mariozechner/pi-ai/dist/providers/openai-completions.js`

并在其中命中：

1. `reasoning_content`
2. `thinkingFormat`
3. `enable_thinking`

### 3. 找到两处核心逻辑

第一处在流式解析位置，会把以下字段识别为 thinking：

```js
const reasoningFields = ["reasoning_content", "reasoning", "reasoning_text"];
```

第二处在 assistant message 回写位置，会补：

```js
assistantMsg.reasoning_content = "";
```

这两处正是 DeepSeek V4 会话后续 400 的核心来源。

## 最小修复方案

本次没有尝试“完整支持 DeepSeek V4 thinking 协议”，而是采用最小绕过方案：

1. 对 `deepseek.com` 的流式响应，不再把 `reasoning_content` 等字段转成 OpenClaw 内部 `thinking` block
2. 对 `deepseek.com`，不再给 assistant message 自动补空的 `reasoning_content`

### 修改点 1

在流式处理逻辑中加入：

```js
const isDeepSeekReasoningStream = model.baseUrl?.includes("deepseek.com");
```

并仅在 `!isDeepSeekReasoningStream` 时才扫描：

```js
const reasoningFields = ["reasoning_content", "reasoning", "reasoning_text"];
```

### 修改点 2

在 assistant message 组装逻辑中加入：

```js
if (!model.baseUrl?.includes("deepseek.com") &&
    compat.requiresReasoningContentOnAssistantMessages &&
    model.reasoning &&
    assistantMsg.reasoning_content === undefined) {
    assistantMsg.reasoning_content = "";
}
```

## 修复后的判断口径

如果后续继续使用 DeepSeek V4，需要按下面口径判断是否已真正修复：

1. `main` agent 的模型是否已明确切到 `deepseek/deepseek-v4-flash`
2. 是否使用了新的 session key，而不是继续复用旧 `main` session
3. 新 session 中发送最简单消息（例如 `你好`）时，是否仍报 `reasoning_content` 相关 400
4. 如果不再报该错误，才说明 DeepSeek V4 基础对话链路已恢复

## 额外发现

### 1. `openclaw tui` 默认 session key 是 `main`

这意味着如果直接执行：

```bash
openclaw tui
```

通常会继续复用旧会话。

要显式创建新会话，应改用：

```bash
openclaw tui --session flashfix-1 --message "你好"
```

### 2. session 列表可用于确认当前模型绑定

可以通过以下命令确认不同会话实际绑定的模型：

```bash
openclaw sessions --json
```

### 3. qqbot 插件可能存在独立运行时目录问题

在后续验证中，还出现过：

```text
failed to load bundled channel qqbot: ENOTEMPTY: directory not empty, rmdir ...
```

这说明除 DeepSeek V4 兼容问题外，qqbot 插件运行时目录也可能有独立缓存/清理问题。该问题与 `reasoning_content` 不是同一个故障点。

## 当前建议

### 短期建议

1. 如果目标是先恢复 OpenClaw 稳定可用，优先使用 `deepseek/deepseek-chat`
2. 如果目标是验证 V4，优先使用新 session 做最小消息测试，不要直接复用业务会话

### 中期建议

1. 保留本次最小 patch
2. 后续如需真正支持 DeepSeek V4 thinking 协议，再单独做完整兼容，而不是继续依赖简单配置项

## 本次排障结论

本次失败并不是“DeepSeek 配不上”或“OpenClaw 版本太老”，而是：

1. 会话模型与默认模型一开始不一致
2. 旧 session 会污染模型切换后的验证结果
3. 实际生效的 pnpm 安装路径最初未定位到
4. OpenClaw `openai-completions` 适配层会把 DeepSeek V4 返回的 `reasoning_content` 错当成内部 thinking 协议内容处理

真正的修复方向是：

1. 找到真实生效的 provider 代码路径
2. 在 provider 适配层对 DeepSeek 做最小兼容绕过
3. 用全新 session 重新验证，而不是继续在脏会话里试错
