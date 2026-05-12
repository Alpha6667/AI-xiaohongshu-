# 小红书登录态 Runbook

## 目标

本文档用于保护服务器上的小红书真实登录态，确保 OpenClaw 可以稳定使用创作者中心完成真实发布和 metrics 抓取。

## 关键目录

真实登录态 Chrome profile 目录：

```text
/root/.openclaw/xhs-profile-persist
```

OpenClaw runtime 缓存目录：

```text
/root/.openclaw/plugin-runtime-deps/
```

发布状态目录：

```text
/root/.openclaw/publish-state/
```

发布锁目录：

```text
/root/.openclaw/publish-locks/
```

## 保护规则

1. 禁止删除、移动、清空 `/root/.openclaw/xhs-profile-persist`。
2. 禁止提交 Chrome profile、Cookies、token、截图和账号密码。
3. 禁止在聊天回复、日志摘录或文档中输出 Cookie/token 真实值。
4. 可以检查关键 Cookie 是否存在，但只能输出存在性。
5. runtime 缓存可以重建，登录态 profile 是核心资产。
6. 服务器重启后优先复用持久化 profile。

## 健康检查

OpenClaw 应提供 `/health` 接口，期望返回：

```json
{
  "status": "healthy",
  "realPublish": true
}
```

登录态健康检查应验证：

1. 可以打开 `https://creator.xiaohongshu.com/new/home`。
2. 页面标题包含小红书创作服务平台相关文本。
3. 关键 Cookie 存在，例如 `access-token`、`a1`、`x-user-id`。
4. 检查结果只输出 Cookie 名称存在性和数量。

## 登录态失效处理

当 OpenClaw 返回 `login_required` 或页面跳转到登录页时，按以下顺序处理：

1. 暂停真实发布和真实 metrics 抓取。
2. 保留当前 profile 目录。
3. 由用户在服务器环境中重新完成登录。
4. 登录后执行健康检查。
5. 健康检查通过后恢复发布和 metrics 流程。

## 服务器重启恢复

服务器重启后按以下顺序恢复：

1. 启动 OpenClaw 服务。
2. 调用 `/health` 确认 `realPublish=true`。
3. 执行登录态健康检查。
4. 检查 `/root/.openclaw/publish-locks/` 是否存在遗留锁。
5. 根据 `/root/.openclaw/publish-state/` 判断遗留发布是否需要人工核对。
6. 启动后端和前端。
7. 用一条已发布帖子执行 `refresh-metrics` 验证创作者中心访问正常。

## 备份建议

登录态目录可以做服务器本地备份，备份过程必须满足：

1. 备份文件留在受控服务器内。
2. 备份文件不能提交到 Git。
3. 备份文件不能上传到公开对象存储。
4. 恢复前确认 OpenClaw 进程已停止使用该 profile。

## 故障排查

常见故障和处理方式：

1. `login_required`：登录态失效，按登录态失效处理流程执行。
2. `page_structure_changed`：小红书页面结构变化，OpenClaw 需要更新选择器。
3. `metrics_fetch_timeout`：服务器资源紧张或页面加载慢，先检查 Chromium 进程和内存。
4. 发布超时：检查发布状态文件和创作者中心，确认是否已发布。
5. 图片上传失败：检查素材路径是否存在，检查 OpenClaw 是否能访问本地文件。
