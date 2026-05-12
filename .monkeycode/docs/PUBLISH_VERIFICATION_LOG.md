# 真实图文发布验收日志

## 发布信息

| 字段 | 值 |
|------|-----|
| **postId** | `post_9100f36d13` |
| **platformPostId** | `6a026a40000000003600289d` |
| **标题** | 「永失吾爱·破败之影」——佛耶戈的孤寂与宿命 |
| **正文** | 在破碎的废墟中，他举目仰望，手握永恒之剑，仿佛感受到那失去的爱依旧在身旁徘徊。风中灰烬、破碎的建筑，每一丝阴影都在低语——这是他的宿命，也是他的孤独。 |
| **tags** | 英雄联盟、佛耶戈 |
| **素材** | `asset_3876dcbec3` — 佛耶戈.png |
| **账号** | `brand_main` |
| **发布平台** | 小红书创作者中心 |
| **发布时间** | 2026-05-12 07:46 CST |

## finalBody（实际发往小红书）

```
在破碎的废墟中，他举目仰望，手握永恒之剑，仿佛感受到那失去的爱依旧在身旁徘徊。风中灰烬、破碎的建筑，每一丝阴影都在低语——这是他的宿命，也是他的孤独。

#英雄联盟 #佛耶戈
```

## 验收结果

| 验收项 | 结果 |
|--------|------|
| 真实发布成功 | ✅ |
| 只发布 1 条，没有重复 | ✅ |
| platformPostId 是真实小红书 noteId | ✅ `6a026a40000000003600289d` |
| 图片上传成功 | ✅ |
| 正文包含 `#英雄联盟 #佛耶戈` | ✅ |
| refresh-metrics 成功 | ✅ |
| metrics source = `xhs_creator_center` | ✅ |
| 前端图片展示已修复并可显示 | ✅ |
| 后端 asset content endpoint 已修复 | ✅ `/api/assets/{assetId}/content` |
| 发布状态持久化 | ✅ |
| lock 防重复机制 | ✅ |
| 32 项后端测试通过 | ✅ |
| 17 项持久化测试通过 | ✅ |

## 验收日期

2026-05-12 — 这证明了系统具备以下能力：

- 纯自动化发布完整链路（QQ→Backend→OpenClaw→XHS→回写→Metrics）
- 带图片发布
- 话题标签正确拼接
- metrics 指标准确性（通过 SVG path 分析修复字段映射）
- 前端素材图片通过后端 API 代理显示
- 发布状态持久化和防重复 lock

## 已修复的问题与改进

| 问题 | 修复措施 |
|------|----------|
| 初始 webhook 环境变量缺失导致 publishing 未真正调用 OpenClaw | 补充 `OPENCLAW_AI_URL` 、 `OPENCLAW_AI_TOKEN` 环境变量 |
| `xhs_publish.js` body/finalBody 变量问题导致发布脚本失败 | 修复变量传递和字符串拼接 |
| 曾出现伪造 `xh_realtime_` 前缀的 platformPostId | 清理；已固化规则：没有真实 platformPostId 禁止 published |
| metrics likes 和 favorites 对调 | 通过 SVG path 分析确认 DOM 图标顺序；修复字段映射 |
| 前端素材显示"素材加载失败" | 后端新增 `GET /api/assets/{assetId}/content` 代理本地文件 |
| 无防重复发布机制 | 实现 publish-state 持久化和 publish-lock 防重复 |

## 硬性规则（不可违背）

1. **published 只能由真实回调写入** — 禁止伪造 platformPostId
2. **同一个 postId 禁止二次触发发布** — lock 机制拦截
3. **发布前必须检查 webhook 和 /health** — 确保系统健康
4. **失败先查创作者中心** — 确认是否实际已经发布成功
5. **lock 超过 30 分钟自动清理** — 防止僵尸锁
6. **submitClicked=true 后禁止再次点击发布按钮**
7. **不保存 token、Cookie、Chrome profile 到状态文件**
