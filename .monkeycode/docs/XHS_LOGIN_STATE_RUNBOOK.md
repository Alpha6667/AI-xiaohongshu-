# 小红书登录态持久化与恢复运行手册

> 本手册供后续所有模型、协作者和运维人员使用。
> 登录态是真实发布和 metrics 抓取的命脉，操作不当会导致全部链路中断。
> **禁止输出任何 Cookie 值、token 值、session 值、profile 内容到任何输出中。**

---

## 1. 登录态目录说明

### 唯一路径

```
/root/.openclaw/xhs-profile-persist
```

这是小红书创作者中心（`creator.xiaohongshu.com`）的真实登录态 Chrome profile 目录。所有真实发布和 live metrics 抓取都依赖该目录中的持久化 Cookie 和 session。

### 硬性规则（不可违背）

| 规则 | 说明 |
|------|------|
| **禁止删除** | 删除后需重新扫码登录 |
| **禁止移动** | 路径固定为 `/root/.openclaw/xhs-profile-persist` |
| **禁止打包上传** | 任何形式都不允许 |
| **禁止复制到其他机器** | profile 与当前机器绑定 |
| **禁止输出 Cookie/token/session** | 型号输出值、文件名输出值、数量输出值均禁止（只允许检查是否存在） |
| **禁止提交到 Git** | `.gitignore` 已忽略 |
| **禁止用于无关测试** | 只能由真实发布和 metrics 抓取使用 |
| **禁止模型输出任何 profile 内容** | 包括文件名列表、Cookie 名称、token 前缀 |

### 目录结构

```
/root/.openclaw/xhs-profile-persist/
├── Default/                # Chrome 默认 profile
│   ├── Cookies             # SQLite 持久化 cookie 数据库
│   ├── Cookies-journal
│   ├── Login Data          # 登录态数据
│   ├── Network Persistent State
│   ├── Preferences         # Chrome 偏好设置
│   └── ...
├── First Run
├── Local State
└── ...
```

---

## 2. 登录态健康检查

### 检查方式（只读）

**步骤 1：确认目录存在**

```bash
ls -ld /root/.openclaw/xhs-profile-persist
```

期望输出类似：
```
drwxr-xr-x ... /root/.openclaw/xhs-profile-persist
```

不存在则登录态已丢失。

**步骤 2：确认 OpenClaw 服务健康**

```bash
curl -s http://127.0.0.1:18790/health
```

期望返回 `{"status":"ok"}` 或类似健康响应。

**步骤 3：用真实浏览器打开创作者中心**

使用 Playwright 以 `xhs-profile-persist` 为 `userDataDir`（有头或无头均可），打开：

```
https://creator.xiaohongshu.com/new/home
```

**判断标准：**

- **登录有效**：页面标题包含"小红书创作服务平台"，URL 不包含 `/login`
- **登录失效**：页面跳转到 `https://creator.xiaohongshu.com/login` 或标题不含"小红书创作服务平台"

**步骤 4：检查 Cookie 存在性（仅检查是否存在，不输出值）**

通过 Playwright `page.evaluate()` 执行：

```javascript
const cookies = document.cookie.split(';').map(c => c.trim().split('=')[0]);
```

只输出：
- Cookie 总数（数字）
- 是否存在 `access-token`（布尔值）
- 是否存在 `a1`（布尔值）
- 是否存在 `x-user-id`（布尔值）

**禁止输出** Cookie 的值、完整字符串、部分字符。

### 健康检查脚本伪代码

```javascript
async function checkLoginHealth() {
  const browser = await chromium.launchPersistentContext(PROFILE_DIR, {...});
  const page = await browser.newPage();
  await page.goto('https://creator.xiaohongshu.com/new/home');
  const title = await page.title();
  const url = page.url();
  const isLoggedIn = title.includes('小红书创作服务平台') && !url.includes('/login');
  return { isLoggedIn, title, url };
}
```

---

## 3. 登录态失效处理

### 失效判定

以下任一情况视为登录态失效：

1. **页面跳转到登录页**：`creator.xiaohongshu.com/login`
2. **发布返回 `login_required` 错误**
3. **metrics 抓取返回 `login_required` 或跳登录页**
4. **Cookie 中缺少 `access-token` 或 `a1`**

### 失效后的标准操作

```
┌─────────────────────────────┐
│  检测到登录态失效             │
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│  1. 停止所有真实发布任务     │
│  2. 停止所有 metrics 抓取    │
│  3. 不重试真实发布           │
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│  4. 通知用户需要重新登录     │
│     （说明：登录态已失效，    │
│      需要手动扫码登录）      │
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│  5. 用户手动完成扫码登录后   │
│     执行健康检查（第2节）    │
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│  6. 健康检查通过后           │
│     恢复发布/metrics 任务    │
└─────────────────────────────┘
```

**关键原则**：
- ❌ **不要自动重试真实发布**
- ❌ **不要自动刷新 Token**
- ❌ **不要尝试绕过登录页**
- ✅ **及时通知用户**
- ✅ **等待用户手动干预**

---

## 4. 服务器重启后的恢复流程

### 关键事实

**只要 `/root/.openclaw/xhs-profile-persist` 还在，就不需要重新登录。**

重启顺序：

```
┌─────────────────────────────┐
│  服务器重启                  │
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│  1. 确认 profile 目录存在    │
│     ls -ld /root/.openclaw/  │
│     xhs-profile-persist      │
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│  2. 重启 OpenClaw 服务      │
│     systemctl restart       │
│     openclaw.service        │
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│  3. 检查 OpenClaw /health   │
│     curl http://127.0.0.1:  │
│     18790/health            │
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│  4. 重启后端服务            │
│     systemctl restart       │
│     ai-xiaohongshu-         │
│     backend.service         │
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│  5. 健康检查通过后           │
│     执行登录态预热           │
│     （打开创作者中心首页）    │
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│  6. 预热通过后               │
│     恢复发布/metrics 任务    │
└─────────────────────────────┘
```

### 登录态预热

预热目的：让小红书服务器认为这是一个活跃的浏览器 session，而非冷启动脚本。

预热步骤：
1. 使用 `xhs-profile-persist` 作为 profile 启动浏览器
2. 打开 `https://creator.xiaohongshu.com/new/home`
3. 等待页面完全加载
4. 在页面停留 3-5 秒
5. 确认标题为"小红书创作服务平台"
6. 关闭浏览器
7. 预热完成

预热脚本示例（只展示框架，不包含敏感值）：

```javascript
async function warmupSession() {
  const browser = await chromium.launchPersistentContext(PROFILE_DIR, {...});
  const page = await browser.newPage();
  // 先去新首页预热 cookie session
  await page.goto('https://creator.xiaohongshu.com/new/home', { waitUntil: 'load' });
  await page.waitForTimeout(5000);
  // 页面内容不需要额外操作，session 已预热
  await browser.close();
}
```

---

## 5. OpenClaw runtime 缓存与登录态的区别

### 可清理/重建的

```
/root/.openclaw/plugin-runtime-deps/
```

- 类型：插件运行时缓存
- 内容：Playwright browser binary、npm 依赖、临时文件
- 损坏影响：插件启动失败
- 修复方式：删除后自动重建（OpenClaw 会重新下载/安装）

### 禁止清理的

```
/root/.openclaw/xhs-profile-persist/
```

- 类型：小红书真实登录态
- 内容：持久化 Cookie、session、Chrome 偏好
- 损坏影响：登录态丢失，需重新扫码
- 修复方式：只能手动扫码登录

### 对比总结

| 目录 | 类型 | 允许清理 | 清理后影响 | 修复方式 |
|------|------|----------|------------|----------|
| `plugin-runtime-deps/` | 运行时缓存 | ✅ 可以 | 插件可能需要重建 | 自动重建 |
| `xhs-profile-persist/` | 登录态 | ❌ 禁止 | 登录态丢失 | 手动扫码 |
| `publish-state/` | 发布状态 | ⚠️ 谨慎 | 发布审计丢失 | 不可恢复 |
| `publish-locks/` | 发布锁 | ✅ 可以 | 锁释放 | 自动重建 |

---

## 6. 登录态备份策略

### 默认策略

- **不备份**。登录态以当前机器/目录为准。

### 如需备份（仅在用户明确授权下）

1. 用户自己登录服务器
2. 使用用户指定的加密方式打包（如 `gpg --symmetric`）
3. 备份文件存储在用户指定的安全位置
4. 不通过聊天、Git、附件、公网链接传输
5. 不由模型输出任何 profile 内容、文件内容、路径内容

### 备份命令示例（框架，不含真实路径）

```bash
# 只能在用户明确授权下执行
tar -czf /tmp/xhs-profile-backup.tar.gz -C /root/.openclaw xhs-profile-persist
# 加密
gpg --symmetric --cipher-algo AES256 /tmp/xhs-profile-backup.tar.gz
# 存储到用户指定位置
```

---

## 7. 登录态与真实发布的关系

### 执行前检查链

```
每次真实发布申请
    │
    ▼
登录态健康检查 ──── 不通过 ──→ 通知用户，拒绝发布
    │
    通过
    │
    ▼
OpenClaw /health ──── 不通过 ──→ 通知用户，拒绝发布
    │
    通过
    │
    ▼
执行发布
```

### 执行中的登录态失效

```
发布过程中检测到登录失效
    │
    ▼
标记发布失败（failed + login_required）
    │
    ▼
保留已获取的 platformPostId（如有）
    │
    ▼
停止后续操作
    │
    ▼
通知用户
```

### metrics 与登录态

```
metrics 抓取前
    │
    ▼
登录态健康检查 ──── 不通过 ──→ 返回 login_required，不重试
    │
    通过
    │
    ▼
执行抓取
```

### 关键原则

- **登录态失效不是代码问题，需要用户重新登录**
- **login_required 时不能继续发布或抓取**
- **发布失败不等于登录态失效**，需要分开排查

---

## 8. 故障排查清单

```text
┌─── 页面是否跳转登录页？
│   ├─ 是 → 登录态已失效，走第3节失效处理
│   └─ 否 → 继续
│
├─── Cookie 是否存在？
│   ├─ 否 → 检查 profile 目录是否完整
│   │    ls -la /root/.openclaw/xhs-profile-persist/
│   └─ 是 → 检查关键 Cookie（仅检查存在性）
│        ├─ access-token 存在？
│        ├─ a1 存在？
│        └─ x-user-id 存在？
│
├─── Chrome 是否能启动？
│   ├─ 否 → 检查 Playwright 安装
│   │    npx playwright install chromium
│   │    检查内存是否足够（free -h）
│   │    检查磁盘空间（df -h）
│   └─ 是 → 继续
│
├─── 服务器内存是否足够？
│   ├─ 1GB 以下 → 可能 OOM，考虑升级配置
│   ├─ 1-2GB → 注意并发数
│   └─ 2GB+ → 正常
│
├─── OpenClaw 服务是否 healthy？
│   ├─ 否 → systemctl restart openclaw.service
│   └─ 是 → 继续
│
├─── 是否误删/移动 profile 目录？
│   ├─ 是 → 尝试从备份恢复或重新登录
│   └─ 否 → 继续
│
├─── 是否清理了错误的目录？
│   ├─ 清理了 xhs-profile-persist → 登录态丢失
│   └─ 清理了 plugin-runtime-deps → 可自动重建
│
├─── Playwright 是否使用了正确的 userDataDir？
│   ├─ 是 → xhs-profile-persist
│   └─ 否 → 修正 launchPersistentContext 的路径参数
│
└─── 仍然无法解决？
    ├─ 检查日志：journalctl -u openclaw.service
    ├─ 检查后端日志：journalctl -u ai-xiaohongshu-backend.service
    └─ 通知用户需要手动扫码登录
```

---

## 9. 最小命令参考

### 目录检查（只读）

```bash
# 检查 profile 目录是否存在
ls -ld /root/.openclaw/xhs-profile-persist

# 检查发布状态目录
ls /root/.openclaw/publish-state/

# 检查发布锁目录
ls /root/.openclaw/publish-locks/
```

### 服务健康检查

```bash
# OpenClaw 服务
curl -s http://127.0.0.1:18790/health

# 后端服务
curl -s http://127.0.0.1:8000/api/health

# 后端帖子 API（示例，不返回敏感信息）
curl -s http://127.0.0.1:8000/api/posts/post_9100f36d13 | python3 -c "import sys,json; d=json.load(sys.stdin); print('status:', d.get('status'))"
```

### 服务管理

```bash
# OpenClaw
systemctl restart openclaw.service
systemctl status openclaw.service --no-pager -l

# 后端
systemctl restart ai-xiaohongshu-backend.service
systemctl status ai-xiaohongshu-backend.service --no-pager -l
```

### 登录态预热

```bash
# 通过 OpenClaw xhs_metrics.js 预热（已有登录态检查逻辑）
NODE_PATH=/root/.nvm/versions/node/v22.22.0/lib/node_modules \
XHS_PROFILE_DIR=/root/.openclaw/xhs-profile-persist \
XHS_HEADLESS=true \
timeout 60 node /srv/AI-xiaohongshu-/openclaw/xhs_metrics.js

# 或者直接 Playwright
node -e "
const {chromium} = require('playwright');
(async () => {
  const b = await chromium.launchPersistentContext('/root/.openclaw/xhs-profile-persist', {headless: true});
  const p = await b.newPage();
  await p.goto('https://creator.xiaohongshu.com/new/home', {waitUntil: 'load'});
  const t = await p.title();
  const u = p.url();
  const ok = t.includes('小红书创作服务平台') && !u.includes('/login');
  console.log('ok:', ok, 'title:', t);
  await b.close();
})();
"
```

---

## 10. 新模型读取指引

后续每次更换模型时，按以下顺序读取运行手册：

```text
1. .monkeycode/docs/XHS_LOGIN_STATE_RUNBOOK.md    ← 本文
  了解登录态位置、保护规则、检查方式、失效处理

2. .monkeycode/docs/REAL_PUBLISH_RUNBOOK.md         ← 发布运行手册
  了解真实发布全流程、lock/state 机制、风险控制

3. .monkeycode/docs/PUBLISH_VERIFICATION_LOG.md    ← 上次真实验收日志
  了解当前系统已验证的能力和已知问题

4. .monkeycode/MEMORY.md                             ← 项目记忆
  了解历史决策、用户偏好、技术规范
```

### 新模型首次上手的核心原则

1. **读文档，不要猜** — 所有流程都在以上文档中
2. **禁止输出 Cookie/token/profile** — 只能检查存在性
3. **禁止删除/移动/打包 profile** — 目录不可触碰
4. **禁止伪造 platformPostId** — 只能由真实回调写入
5. **登录态失效 → 通知用户 → 等待手动登录**
6. **有 lock 时拒绝发布，有 submitClicked 时跳过点击**
7. **不懂操作先问用户，不要自行尝试**

---

> 最后更新：2026-05-12
> 关联仓库：github.com/Alpha6667/AI-xiaohongshu-
> 相关文件：REAL_PUBLISH_RUNBOOK.md · PUBLISH_VERIFICATION_LOG.md · MEMORY.md
