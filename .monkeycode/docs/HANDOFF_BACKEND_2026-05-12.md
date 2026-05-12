# 2026-05-12 后端交接文档

## 当前状态

后端已经支撑真实发布回写、真实 metrics 保存、素材内容代理、人工验证错误码保存和前端所需展示字段。

当前后端职责已经收口到三类稳定契约：发布状态只能由真实 OpenClaw 回调写入，metrics 只能由 OpenClaw 返回后通过后端 service 持久化，前端素材访问只能使用浏览器可访问的后端代理 URL。

## 关键提交

```text
e565754 fix: serve local asset content via API
b5ec642 fix: accept manual verification metrics error
```

## 主要能力

1. `GET /api/posts` 返回帖子列表、素材摘要、metrics 和同步状态。
2. `GET /api/posts/{postId}` 返回帖子详情、assets、`platformPostId`、metrics、sync 状态和错误。
3. `POST /api/posts/{postId}/publish` 调用 OpenClaw 发布 webhook。
4. `POST /api/posts/{postId}/refresh-metrics` 调用 OpenClaw metrics webhook 并保存结果。
5. `GET /api/assets/{assetId}/content` 代理 repository 登记过的本地素材内容。
6. OpenClaw metrics 错误码 allowlist 支持 `post_needs_manual_verification`。

## 制作过程中遇到的问题与解决方案

### 问题 1：前端无法直接显示服务器本地素材路径

现象：帖子详情页拿到的素材路径曾指向服务器本地文件，例如 OpenClaw profile 或素材缓存目录，浏览器无法直接访问，页面显示素材加载失败。

解决方案：后端新增 `GET /api/assets/{assetId}/content`，只代理 repository 中登记过的本地素材文件，并在 `GET /api/posts`、`GET /api/posts/{postId}` 和 `GET /api/assets` 中把前端展示 URL 统一改为 `/api/assets/{assetId}/content`。

关键约束：OpenClaw 发布 payload 继续使用原始素材路径，避免破坏真实上传链路。

### 问题 2：OpenClaw 返回的 metrics source 存在历史命名差异

现象：历史代码中出现过 `xhscreatorcenter`、`xhscreator_center` 和 `xhs_creator_center` 多种写法，影响后端保存和前端展示一致性。

解决方案：后端在 publisher/repository 层对 source 做规范化，真实小红书创作者中心数据统一保存并返回 `xhs_creator_center`，mock 数据保留 `mock`。

### 问题 3：repository reload 后部分字段曾丢失

现象：测试中发现 published post、metrics source、capturedAt、sync 状态等字段在 JSON repository 重新加载后可能出现 camelCase/snake_case 兼容问题。

解决方案：在 `backend/app/repositories/memory.py` 增加兼容读取逻辑，并通过持久化测试覆盖 reload 场景。

### 问题 4：人工验证错误曾被归一化为通用执行错误

现象：OpenClaw 将 captcha / 人工验证页归类为 `post_needs_manual_verification` 后，后端 allowlist 缺少该值，会把它归一成 `metrics_fetch_execution_error`。

解决方案：在 `backend/app/services/publisher.py` 的 OpenClaw metrics 错误码 allowlist 中加入 `post_needs_manual_verification`，并在 API 测试中确认 `syncError` 会保存原始错误码。

### 问题 5：开发环境无法复现生产帖子数据

现象：本地开发 repository 缺少生产主验证帖子，直接访问 `post_3b524758e2` 会返回 `404`。

解决方案：开发环境只跑后端契约和持久化测试；真实帖子、真实登录态、真实 metrics 复验必须在用户服务器生产路径完成。

## 关键文件

```text
backend/app/services/publisher.py
backend/app/services/posts.py
backend/app/services/assets.py
backend/app/api/routes/assets.py
backend/app/schemas/posts.py
backend/app/schemas/assets.py
backend/app/repositories/memory.py
backend/tests/test_api_minimal.py
backend/tests/test_repository_persistence.py
backend/tests/test_publish_persistence.py
```

文件职责补充：

1. `backend/app/services/publisher.py`：OpenClaw webhook payload、metrics source/errorCode 规范化、发布与 metrics 适配逻辑。
2. `backend/app/services/posts.py`：帖子列表和详情响应组装，负责把素材转换为前端可访问 URL。
3. `backend/app/services/assets.py`：素材响应序列化、本地文件代理、远程 URL 防代理保护。
4. `backend/app/api/routes/assets.py`：素材内容接口路由入口。
5. `backend/app/repositories/memory.py`：JSON repository 持久化、camelCase/snake_case 兼容读取、metrics 和 sync 状态 reload 保真。
6. `backend/tests/test_api_minimal.py`：后端 API 契约、素材代理、OpenClaw payload、metrics 错误状态覆盖。
7. `backend/tests/test_repository_persistence.py`：repository reload 后字段保真覆盖。
8. `backend/tests/test_publish_persistence.py`：发布持久化和防重复相关覆盖。

## 素材接口约束

1. 前端展示素材时使用 `/api/assets/{assetId}/content`。
2. 后端 API 不向前端暴露 `/root/.openclaw/...` 本地路径。
3. 只有 repository 登记过的 assetId 可以被代理。
4. 本地文件缺失返回 `404`。
5. 远程 URL 不由后端代理，返回 `403`。
6. 发布 payload 给 OpenClaw 仍保留原始素材路径，保证真实上传链路不受影响。

## Metrics 错误码

允许的 OpenClaw metrics 错误码包括：

```text
login_required
post_not_found
page_structure_changed
post_needs_manual_verification
metrics_unavailable
metrics_fetch_timeout
metrics_fetch_execution_error
```

当 OpenClaw 返回：

```text
post_needs_manual_verification
```

后端应保存并返回：

```text
lastSyncStatus = failed
syncError = post_needs_manual_verification
```

人工验证完成后，metrics 成功刷新时应保存并返回：

```text
lastSyncStatus = succeeded
syncError = null
source = xhs_creator_center
```

## 已通过测试

```bash
python3 -m pytest tests/test_api_minimal.py
python3 -m pytest tests/test_repository_persistence.py
```

已知结果：

```text
tests/test_api_minimal.py: 31 passed
tests/test_repository_persistence.py: 4 passed
```

后端交接文档补充时的复验命令：

```bash
python3 -m pytest tests/test_api_minimal.py tests/test_repository_persistence.py tests/test_publish_persistence.py
```

建议后续每次修改发布、metrics、素材或 repository 持久化逻辑后至少运行上述三组测试。

## 当前注意事项

1. 不要手工修改生产 `backend/data/repository.json`。
2. 不要手工回写 `platformPostId`。
3. 不要手工写 `metrics-snapshots`。
4. 无真实 `platformPostId` 时不能把帖子标记为 `published`。
5. 真实发布失败恢复必须走 service/repository 正式流程。
6. 后端、OpenClaw、前端跨服务器时，服务互调不能使用不可达的 `127.0.0.1`。
7. 不要在开发环境用生产 postId 失败结果判断生产数据是否异常。
8. 不要把 OpenClaw 本地素材路径暴露给前端 API。
9. 不要代理任意远程素材 URL，避免后端变成开放代理。
10. 新增 metrics 错误码时，需要同步更新 `TEAM_COLLABORATION_RULES.md`、后端 allowlist、前端展示文案和测试。

## 后续交接注意事项

1. 生产部署后优先验证后端接口返回的 `assets[*].url` 是否为 `/api/assets/{assetId}/content`。
2. 人工验证恢复后，确认 `refresh-metrics` 成功会把 `lastSyncStatus` 改回 `succeeded` 并清空 `syncError`。
3. 二次发布防护复验时，只验证后端/OpenClaw 拦截结果，不手工修改生产状态。
4. PostgreSQL 迁移前，需要先冻结 JSON repository 字段契约，并保留导入导出脚本。
5. 增加部署 commit hash 时，建议由后端暴露只读版本接口，前端展示该值用于排查缓存和部署错位。

## 下一步后端优化建议

1. 将 repository JSON 持久化逐步迁移到 PostgreSQL。
2. 增加发布/metrics 操作审计表。
3. 增加人工验证状态的专门字段或错误分类，减少前端解析成本。
4. 增加接口版本信息和部署 commit hash。
5. 为真实发布和 metrics 刷新增补更完整的幂等测试。
