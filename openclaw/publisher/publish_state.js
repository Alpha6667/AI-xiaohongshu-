#!/usr/bin/env node
/**
 * publish_state.js — OpenClaw 发布持久化状态管理
 *
 * 管理 /root/.openclaw/publish-state/{postId}.json 状态文件的生命周期。
 * 不保存 token、Cookie、Chrome profile、账号密码等敏感信息。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STATE_DIR = path.resolve('/root/.openclaw/publish-state');

/** 所有合法的 event 类型（按顺序） */
const VALID_EVENTS = [
  'created',
  'preflight_passed',
  'lock_acquired',
  'browser_started',
  'asset_uploaded',
  'content_filled',
  'submit_clicked',
  'platform_id_detected',
  'callback_sent',
  'callback_confirmed',
  'metrics_refreshed',
  'completed',
  'failed',
  'unknown',
];

const VALID_STATUSES = [
  'idle',
  'preparing',
  'publishing',
  'submit_clicked',
  'callback_pending',
  'completed',
  'failed',
];

/**
 * 计算字符串的 SHA256 hash（用于 finalBody 和 assets，不记录原文）
 * @param {string} input
 * @returns {string}
 */
function sha256(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * 确保状态目录存在
 */
function ensureDir() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

/**
 * 获取状态文件路径
 * @param {string} postId
 * @returns {string}
 */
function statePath(postId) {
  // 防止目录穿越
  const safe = postId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(STATE_DIR, `${safe}.json`);
}

/**
 * 创建初始状态文件
 * @param {object} params
 * @param {string} params.postId
 * @param {string} params.title - 文章标题
 * @param {string[]} params.tags - 标签列表
 * @param {string} [params.finalBody] - 最终发送给 XHS 的正文（可选，用于 hash）
 * @param {string[]} [params.assetHashes] - 素材文件 hash 列表
 * @returns {object} 创建的状态对象
 */
function createState({ postId, title, tags = [], finalBody = '', assetHashes = [] }) {
  ensureDir();
  const now = new Date().toISOString();

  const state = {
    postId,
    title,
    finalBodyHash: finalBody ? sha256(finalBody) : '',
    assetHashes: assetHashes.map((h) => (typeof h === 'string' ? h : sha256(String(h)))),
    tags: [...tags],
    status: 'idle',
    attempt: 1,
    submitClicked: false,
    platformPostId: null,
    startedAt: now,
    updatedAt: now,
    events: [{ event: 'created', timestamp: now, detail: `Publish state created for ${postId}` }],
    lastError: null,
  };

  writeState(postId, state);
  return state;
}

/**
 * 从磁盘读取状态
 * @param {string} postId
 * @returns {object|null}
 */
function readState(postId) {
  const p = statePath(postId);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * 写入状态到磁盘
 * @param {string} postId
 * @param {object} state
 */
function writeState(postId, state) {
  ensureDir();
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(statePath(postId), JSON.stringify(state, null, 2), 'utf8');
}

/**
 * 添加一条 event 记录，可选地更新 status
 * @param {string} postId
 * @param {string} event - 事件类型（必须在 VALID_EVENTS 列表中）
 * @param {string} [detail] - 事件详情
 * @param {string} [newStatus] - 可选的新状态（更新 status 字段）
 * @returns {object} 更新后的状态
 */
function addEvent(postId, event, detail = '', newStatus = null) {
  if (!VALID_EVENTS.includes(event)) {
    throw new Error(
      `Invalid event "${event}". Valid events: ${VALID_EVENTS.join(', ')}`
    );
  }

  const state = readState(postId);
  if (!state) {
    throw new Error(`State not found for postId: ${postId}`);
  }

  state.events.push({
    event,
    timestamp: new Date().toISOString(),
    detail: detail || event,
  });

  if (newStatus) {
    if (!VALID_STATUSES.includes(newStatus)) {
      throw new Error(
        `Invalid status "${newStatus}". Valid statuses: ${VALID_STATUSES.join(', ')}`
      );
    }
    state.status = newStatus;

    // 同步更新 submitClicked 标志
    if (newStatus === 'submit_clicked') {
      state.submitClicked = true;
    }
  }

  writeState(postId, state);
  return state;
}

/**
 * 更新 platformPostId
 * @param {string} postId
 * @param {string} platformPostId
 * @returns {object} 更新后的状态
 */
function setPlatformPostId(postId, platformPostId) {
  const state = readState(postId);
  if (!state) throw new Error(`State not found for postId: ${postId}`);

  state.platformPostId = platformPostId;
  writeState(postId, state);
  return state;
}

/**
 * 记录错误信息
 * @param {string} postId
 * @param {string} errorMessage
 * @returns {object} 更新后的状态
 */
function setError(postId, errorMessage) {
  const state = readState(postId);
  if (!state) throw new Error(`State not found for postId: ${postId}`);

  state.lastError = errorMessage;
  writeState(postId, state);
  return state;
}

/**
 * 标记发布失败（状态设为 failed，添加 failed event，记录错误）
 * @param {string} postId
 * @param {string} errorMessage
 * @returns {object} 更新后的状态
 */
function markFailed(postId, errorMessage) {
  const state = readState(postId);
  if (!state) throw new Error(`State not found for postId: ${postId}`);

  state.status = 'failed';
  state.submitClicked = false; // 失败后允许重新尝试
  state.lastError = errorMessage;
  state.events.push({
    event: 'failed',
    timestamp: new Date().toISOString(),
    detail: errorMessage,
  });

  writeState(postId, state);
  return state;
}

/**
 * 标记发布完成
 * @param {string} postId
 * @param {string} platformPostId
 * @returns {object} 更新后的状态
 */
function markCompleted(postId, platformPostId) {
  const state = readState(postId);
  if (!state) throw new Error(`State not found for postId: ${postId}`);

  state.status = 'completed';
  state.platformPostId = platformPostId || state.platformPostId;
  state.events.push({
    event: 'completed',
    timestamp: new Date().toISOString(),
    detail: platformPostId
      ? `Publish completed with platform post id: ${platformPostId}`
      : 'Publish completed',
  });

  writeState(postId, state);
  return state;
}

/**
 * 检查是否已 submit_clicked
 * @param {string} postId
 * @returns {boolean}
 */
function isSubmitClicked(postId) {
  const state = readState(postId);
  if (!state) return false;
  return state.submitClicked === true;
}

/**
 * 删除状态文件
 * @param {string} postId
 */
function deleteState(postId) {
  const p = statePath(postId);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
  }
}

/**
 * 列出所有状态文件
 * @returns {string[]} postId 列表
 */
function listStates() {
  ensureDir();
  const files = fs.readdirSync(STATE_DIR);
  return files
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}

module.exports = {
  VALID_EVENTS,
  VALID_STATUSES,
  createState,
  readState,
  writeState,
  addEvent,
  setPlatformPostId,
  setError,
  markFailed,
  markCompleted,
  isSubmitClicked,
  deleteState,
  listStates,
  sha256,
};
