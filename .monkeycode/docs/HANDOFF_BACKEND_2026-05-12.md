# 2026-05-12 后端交接文档

## 当前状态

后端已经支撑真实发布回写、真实 metrics 保存、素材内容代理、人工验证错误码保存和前端所需展示字段。

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

## 当前注意事项

1. 不要手工修改生产 `backend/data/repository.json`。
2. 不要手工回写 `platformPostId`。
3. 不要手工写 `metrics-snapshots`。
4. 无真实 `platformPostId` 时不能把帖子标记为 `published`。
5. 真实发布失败恢复必须走 service/repository 正式流程。
6. 后端、OpenClaw、前端跨服务器时，服务互调不能使用不可达的 `127.0.0.1`。

## 下一步后端优化建议

1. 将 repository JSON 持久化逐步迁移到 PostgreSQL。
2. 增加发布/metrics 操作审计表。
3. 增加人工验证状态的专门字段或错误分类，减少前端解析成本。
4. 增加接口版本信息和部署 commit hash。
5. 为真实发布和 metrics 刷新增补更完整的幂等测试。
