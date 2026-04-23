# Requirements Document

## Introduction

本需求定义“QQ -> 后端任务接入”的第一阶段能力。目标是让 OpenClaw 在 QQ 侧收到的真实消息，能够稳定进入后端系统，完成消息接收、去重、落库、转任务和后台可见性验证。

本阶段明确不包含小红书真实发布、多账号调度、权限系统和真实平台风控处理。

## Glossary

- **QQ Channel**: OpenClaw 所在的 QQ 消息来源。
- **Inbound Message**: 从 QQ 进入后端的一条原始消息事件。
- **Message Task**: 由原始消息转换得到的后台任务记录。
- **Dedupe Key**: 用于识别重复消息事件的幂等键。
- **Ingestion Endpoint**: 后端用于接收 QQ/OpenClaw 消息事件的入口。

## Requirements

### Requirement 1

**User Story:** 作为运营者，我希望 QQ 中发给 OpenClaw 的消息能够进入系统，这样我才能验证真实聊天入口已经打通。

#### Acceptance Criteria

1. WHEN QQ/OpenClaw 向后端发送一条合法消息事件, the system SHALL 接收该事件并返回明确的处理结果。
2. IF 消息事件缺少必要字段, the system SHALL 返回可诊断的错误结果并拒绝创建消息记录。
3. WHEN 消息事件被系统接收, the system SHALL 保存原始消息内容、来源标识、发送者标识、会话标识和接收时间。
4. WHILE 本阶段处于“仅验证消息进入系统”状态, the system SHALL 不触发小红书发布流程。

### Requirement 2

**User Story:** 作为系统维护者，我希望重复消息不会重复创建任务，这样我才能保证消息入口稳定可控。

#### Acceptance Criteria

1. WHEN 系统收到带有相同 Dedupe Key 的重复消息事件, the system SHALL 保持幂等并避免重复创建消息任务。
2. IF 上游未提供可直接复用的唯一事件标识, the system SHALL 基于来源、发送者、会话和消息时间生成稳定的 Dedupe Key。
3. WHEN 系统判定消息事件重复, the system SHALL 返回可识别的重复处理结果。

### Requirement 3

**User Story:** 作为运营者，我希望原始消息能转换为后台任务，这样我才能在任务中心看到真实聊天任务。

#### Acceptance Criteria

1. WHEN 一条合法消息完成接收, the system SHALL 创建或关联一条 Message Task。
2. THE system SHALL 为 Message Task 保存 `topic`、`sourceMessage`、`requestedAt`、`stage` 和关联原始消息标识。
3. IF 消息中可以解析出计划时间, the system SHALL 将计划时间保存到任务记录。
4. IF 消息中暂时无法解析出完整主题或计划时间, the system SHALL 仍创建任务并使用可追踪的默认状态。

### Requirement 4

**User Story:** 作为前端页面使用者，我希望消息任务中心可以读取真实 QQ 任务数据，这样我才能验证真实入口已经生效。

#### Acceptance Criteria

1. WHEN 前端请求任务列表, the system SHALL 返回由真实消息生成的任务记录。
2. THE system SHALL 让任务记录可用于前端展示 `sourceMessage`、`title`、`topic`、`stage`、`stageLabel`、`nextAction`、`requestedAt`、`plannedAt` 和 `requiresHumanReview`。
3. IF 任务尚未关联帖子或账号, the system SHALL 允许返回空的关联字段而不阻塞任务展示。

### Requirement 5

**User Story:** 作为系统维护者，我希望消息入口具备最小安全校验和可观测性，这样我才能稳定排查接入问题。

#### Acceptance Criteria

1. WHEN 上游调用 Ingestion Endpoint, the system SHALL 支持最小签名校验或共享密钥校验。
2. IF 签名校验失败, the system SHALL 拒绝处理该消息事件。
3. WHEN 系统处理消息事件, the system SHALL 记录可用于排查的处理结果状态。
4. IF 消息接收成功但任务创建失败, the system SHALL 返回失败结果并保留原始错误上下文。

### Requirement 6

**User Story:** 作为项目负责人，我希望第一阶段只验证单渠道和单账号前置链路，这样我才能控制复杂度和风险。

#### Acceptance Criteria

1. WHILE 第一阶段处于 QQ 接入验证状态, the system SHALL 仅以 QQ 作为真实消息入口目标渠道。
2. WHILE 第一阶段处于 QQ 接入验证状态, the system SHALL 不要求多账号调度能力完成。
3. WHILE 第一阶段处于 QQ 接入验证状态, the system SHALL 不要求小红书真实发布能力完成。
