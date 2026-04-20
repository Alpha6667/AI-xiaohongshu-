# Requirements Document

## Introduction

本功能用于建设一个面向单账号运营的小红书 AI 发帖工作台。系统需要支持主题驱动的文案与图片生成、人工审核与修改、帖子发布流程管理，以及对已发布帖子表现数据的自动采集与分析。

## Requirements

### Requirement 1

**User Story:** AS 运营者, I want to create and manage post drafts from a backend workspace, so that I can organize AI-generated and manually edited content before publishing.

#### Acceptance Criteria

1. WHEN 运营者进入内容工作台, the System SHALL display a draft creation form with fields for topic, title, body, tags, and asset selection.
2. WHEN 运营者保存草稿, the System SHALL persist the draft with a status of `draft`.
3. WHILE 帖子处于 `draft` 状态, the System SHALL allow the Operator to edit title, body, tags, and selected assets.

### Requirement 2

**User Story:** AS 运营者, I want the system to generate candidate copy from a topic, so that I can reduce manual content writing time.

#### Acceptance Criteria

1. WHEN 运营者提交主题和内容风格参数, the System SHALL generate candidate titles, body drafts, and recommended tags.
2. WHEN 文案生成完成, the System SHALL store the generated result as a draft revision linked to the current post draft.

### Requirement 3

**User Story:** AS 运营者, I want a review step before publishing, so that I can manually approve and modify AI-generated content.

#### Acceptance Criteria

1. WHEN 运营者提交草稿审核, the System SHALL change the draft status from `draft` to `in_review`.
2. WHEN 运营者批准草稿, the System SHALL change the draft status to `approved`.
3. WHEN 运营者退回草稿, the System SHALL record a review comment and change the draft status to `draft`.

### Requirement 4

**User Story:** AS 运营者, I want the system to automatically collect post performance data, so that I can view backend metrics without manual entry.

#### Acceptance Criteria

1. WHEN a post is in `published` state, the System SHALL schedule automatic metrics collection for the post.
2. WHEN metrics collection executes, the System SHALL store view count, like count, favorite count, comment count, and follow conversion data when available.
