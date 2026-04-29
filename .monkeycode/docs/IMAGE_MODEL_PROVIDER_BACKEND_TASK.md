# 后端任务单：生图模型厂商配置与服务端接入边界

## 目标

补齐一套后端可维护的生图模型厂商配置能力，让前端可以保存厂商、Key、默认模型与可选 Base URL，并为后续真实接入 OpenAI / 火山方舟等生图 API 提供统一服务端边界。

## 当前约束

1. 当前用户还没有真实 API Key。
2. 本轮不要求一次性把所有厂商的真实生成接口全部接完。
3. 当前重点是先把配置存储、默认模型映射、脱敏返回和无 Key 错误语义做好。

## 本轮边界

1. 本轮不把 Key 返回给前端明文。
2. 本轮不要求浏览器直连第三方模型。
3. 本轮允许真实出图适配层先只接一到两家厂商。

## 必须交付

### 1. 新增模型配置数据结构

至少能表达：

1. `provider`
2. `apiKey`
3. `imageModel`
4. `baseUrl`
5. `hasKey`
6. `maskedKey`
7. `updatedAt`

要求：

1. 服务端持久化保存 Key。
2. 对外读取时不返回明文 `apiKey`。
3. 如当前仓库仍以本地存储持久化，至少保持与现有 repository 风格一致。

### 2. 新增配置接口

建议至少提供：

1. `GET /api/settings/image-provider`
2. `POST /api/settings/image-provider`
3. `POST /api/settings/image-provider/test`

要求：

1. `GET` 只返回脱敏值与当前配置状态。
2. `POST` 支持保存或更新厂商、Key、模型和 Base URL。
3. `test` 在没有 Key 时返回明确可读错误，而不是 500。

### 3. 服务端默认模型映射

后端应内置一份厂商到默认模型的映射。

建议首版支持：

1. `openai -> gpt-image-1`
2. `bfl -> flux.2`
3. `volcengine -> seedream`
4. `tencent -> hunyuan-image`
5. `alibaba -> wanx`
6. `stability -> stable-image`

要求：

1. 当前端只传厂商、不传模型时，服务端自动补默认模型。
2. 当前端主动传模型时，允许覆盖默认值。

### 4. 为真实生图接入预留统一适配层

要求：

1. 不要继续把真实生图调用写死在 `posts.py` 里。
2. 抽出独立图片生成适配层，例如：
   - `prepare provider config`
   - `generate image`
   - `normalize provider response`
3. 当前没有 Key 时，应统一返回例如 `provider_not_configured` 一类稳定错误语义。

### 5. 与现有 `generate-images` 链路衔接

要求：

1. 当前 `POST /api/posts/{post_id}/generate-images` 不应再长期伪造成功素材。
2. 若厂商未配置，应返回明确失败语义，让前端知道去设置页完成配置。
3. 若后续只先接 1 到 2 家真实厂商，也要保证统一通过适配层进入，而不是散落多处条件判断。

### 6. 文档与契约同步

至少同步更新：

1. `.monkeycode/docs/API_CONTRACT.md`

明确：

1. 新配置接口
2. 配置返回结构
3. Key 脱敏规则
4. `provider_not_configured` 等错误语义

### 7. 测试

至少补以下测试：

1. 保存配置后，读取接口不返回明文 Key
2. 只传 Provider 时，可正确补默认模型
3. 未配置 Key 时，测试接口返回稳定错误
4. 未配置厂商时，`generate-images` 返回稳定错误而不是伪造成功

## 建议改动点

1. `backend/app/services/posts.py`
2. `backend/app/repositories/memory.py`
3. `backend/app/schemas/`
4. `backend/app/api/routes/`
5. 新增图片厂商配置与适配层相关服务文件
6. `backend/tests/test_api_minimal.py`

## 验收标准

1. 前端能通过后端接口保存厂商、模型与 Key。
2. 读取配置时只返回脱敏 Key。
3. 厂商切换可以由服务端补默认模型。
4. 当前没有 Key 时，系统返回清晰的“未配置厂商/Key”语义。
5. 真实生图调用边界已从业务服务中抽离，不再继续加重 `posts.py` 的耦合。

## 完成后回复格式

1. commit hash
2. commit message
3. 改动文件列表
4. 配置数据结构说明
5. 默认模型映射说明
6. 脱敏与安全策略说明
7. 错误语义说明
8. 测试结果
9. `git status --short`
