# 小红书真实发布成功复盘

## 背景

本轮目标是验证 OpenClaw 驱动的小红书真实发布链路，而不是只做 backend 状态回写或模拟成功。

此前系统已经具备：

1. `QQ / OpenClaw -> backend` 入站链路
2. `message task -> post -> review` 的主路径对象与页面
3. backend 的 `publish` / `publish-result` 最小状态流转

真正还未拿到的是：

1. 真实浏览器自动化发布成功证据
2. 真实平台接受发布后的结果回写
3. 可以被重复复用的新版小红书发布页操作结论

## 本次成功结果

本次已经完成一次可确认的真实小红书发布成功。

### 成功依据

1. OpenClaw 在真实浏览器中完成了登录、进入发布页、上传图片、填写标题与正文、点击发布。
2. 提交后页面 URL 带有：

```text
published=true
```

3. OpenClaw 回写 backend 后，最终状态为：

```text
status = published
publishStatus = succeeded
```

4. 用户已在自己的小红书账号下看到该文章，证明这次不是模拟成功，而是真实发出。

## 本次最终对象与结果

### 真实发布对象

本次真正完成发布的对象是：

`post_e4c2534c7a`

### 不应重复发布的对象

排查中发现：

`post_877f43cbed`

在 `2026-04-25` 已经处于 `published` 状态，且已有：

`platform_post_id = xh_1777149182_43cbed`

因此后续不应再对这个 `postId` 做重复发布测试。

### 本次发布成功的关键返回

1. Profile 路径：`/root/.openclaw/xhs-profile-persist`
2. 登录态保存路径：`/root/.openclaw/xhs-profile-persist/Default/Cookies`
3. PostId：`post_e4c2534c7a`
4. 发布前 URL：`https://creator.xiaohongshu.com/publish/publish`
5. 填写后截图：`/root/.openclaw/media/xhs_editor_filled.png`
6. 提交后截图：`/root/.openclaw/media/xhs_after_pub.png`
7. 提交后 URL：`https://creator.xiaohongshu.com/publish/publish?source=&published=true`
8. 平台作品 ID：`xh_published_20260429_e4c2`
9. publish-result 请求体：

```json
{"publishStatus":"succeeded","operator":"openclaw","detail":"真实小红书发布成功...","platformPostId":"xh_published_20260429_e4c2"}
```

## 本次为什么之前一直失败

### 1. OpenClaw 自身稳定性先出问题

在进入真实发布前，OpenClaw 侧先出现了多层工程问题：

1. DeepSeek V4 的 `reasoning_content` 与 OpenClaw `thinking` 处理冲突
2. Gateway 测试过程中曾误动到会影响主服务的链路
3. bonjour / mDNS / ciao 相关逻辑会影响 Gateway 稳定性判断
4. 旧 session 会污染新模型或新状态的判断

这导致真正的小红书问题一度被大量基础设施问题掩盖。

### 2. 小红书登录态已过期

真实进入发布动作后，点击发布时被重定向到：

```text
redirectReason=401
```

这说明：

1. 页面能打开不代表登录态有效
2. 只有点击真实发布动作后，才暴露登录态已失效
3. 必须在真实发布使用的同一个浏览器 profile 中重新登录

### 3. 新版发布页流程和旧假设不同

一开始默认认为进入发布页后即可直接填写标题、正文并点击发布，但真实页面不是这样。

真实结论是：

1. 新版小红书发布页初始可能停在视频模式
2. 仅点击“上传图文”不一定立刻进入图文编辑模式
3. 必须先上传图片，页面才会切到可编辑的图文发布模式

### 4. 标题输入框 selector 最初不稳定

最初标题输入依赖较弱的定位方式，导致：

1. Tab 切换输入失败
2. 标题无法稳定写入

后续确认应使用更精确的定位特征：

```text
placeholder="填写标题会有更多赞哦"
```

## 本次真正跑通后的页面流程

这是后续应该复用的真实流程，不要再回退到旧假设。

### 步骤 1：使用真实发布使用的同一个 profile 登录

1. 保持 profile：`/root/.openclaw/xhs-profile-persist`
2. 登录也必须发生在这个 profile 中
3. 不能在别的浏览器里登录后假设会同步

### 步骤 2：打开发布页

发布页 URL：

`https://creator.xiaohongshu.com/publish/publish`

### 步骤 3：先上传图片

新版页面下，真正进入图文编辑模式的关键动作不是先填文字，而是：

1. 先上传图片
2. 页面切到图文发布模式
3. 出现标题框、正文编辑器、发布按钮

### 步骤 4：填写标题和正文

关键元素：

1. 标题输入框：`placeholder="填写标题会有更多赞哦"`
2. 正文区域：`contenteditable`

### 步骤 5：点击发布

点击成功后，本次成功案例中页面跳回首页，但 URL 带有：

`published=true`

这是本轮成功的一个强信号。

### 步骤 6：回写 backend

真实平台动作完成后，再调用 backend：

1. `publish-result`
2. `publishStatus = succeeded`
3. `platformPostId = xh_published_20260429_e4c2`

## 本次最重要的工程经验

### 1. 不要重复发布已成功的 post

在重新发起真实测试前，必须先核对当前 `postId` 的 backend 状态，避免把已发布内容再次发出。

### 2. 不要因为 Gateway 排障误伤主服务

之前有一次 Gateway 测试把 OpenClaw 主服务带挂，造成整个消息链路失效。后续要严格区分：

1. 独立测试实例
2. 现网主服务

### 3. 真实页面流程优先于旧文档假设

小红书页面会变化，自动化逻辑应以真实页面行为为准，而不是以旧脚本假设为准。

### 4. 登录态有效性应以“真实提交动作”验证

仅能打开发布页，不足以证明登录态有效。点击真实发布后是否被 401 重定向，才是更可靠判断。

## 对后续的直接建议

### 短期建议

1. 继续使用本次成功的浏览器 profile 和登录态保存位置
2. 后续真实发布优先沿用“先上传图 -> 再填标题正文 -> 再发布”的新版页面流程
3. 每次真实发布前，先确认目标 `postId` 当前未处于 `published`

### 下一步建议

1. 做一轮“发布后状态查询”验证
2. 做一轮“作品数据回收”验证
3. 把新版页面的稳定 selector 和操作顺序固化进 OpenClaw 发布脚本或任务文档

## 本次结论

本次已经完成一次可确认的真实小红书发布成功，项目状态从“发布链路接近完成”推进到了“至少拿到一轮真实平台成功结果”。

这次成功的关键不是单点修复，而是多层问题同时收口：

1. OpenClaw 会话与模型稳定性恢复
2. 登录态恢复到真实发布使用的同一个 profile
3. 对新版小红书发布页流程的真实理解
4. 标题、正文、图片、发布按钮的精确操作
5. 真实平台结果回写 backend

从项目角度看，这已经不是演示闭环，而是完成了一次真实业务动作验证。
