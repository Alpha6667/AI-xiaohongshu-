#!/usr/bin/env node
/**
 * xhs_preflight.js — 发布前 preflight/mock 模式检查
 *
 * Preflight 阶段只做检查，不创建真实发布状态。
 * Mock 模式下也不创建发布状态文件。
 *
 * 导出 check 函数供 server.js 调用。
 */

const { createState, addEvent, isSubmitClicked, readState, setPlatformPostId, markFailed, markCompleted } = require('./publish_state');
const { acquireLock, releaseLock } = require('./publish_lock');

/**
 * 执行 preflight 检查
 * @param {object} task - 发布任务对象
 * @param {object} task.content - 发布内容
 * @param {string} task.content.body - 正文
 * @param {string[]} task.content.tags - 标签
 * @param {Array} task.content.assets - 素材列表
 * @returns {{ passed: boolean, reason?: string, state?: object }}
 */
function preflightCheck(task) {
  if (!task.postId) {
    return { passed: false, reason: 'Missing postId' };
  }

  // 先读取已有状态，按状态分支处理
  const existingState = readState(task.postId);
  if (existingState) {
    // 已完成 → 拒绝
    if (existingState.status === 'completed') {
      return {
        passed: false,
        reason: `Post ${task.postId} is already completed.`,
      };
    }

    // callback_pending → 只允许补 callback，不允许重发
    if (existingState.status === 'callback_pending') {
      return {
        passed: false,
        reason: `Post ${task.postId} is in callback_pending state. Platform post id: ${existingState.platformPostId}. Please retry callback instead of re-publishing.`,
        platformPostId: existingState.platformPostId,
      };
    }

    // submit_clicked → 禁止再次点击发布
    if (existingState.submitClicked === true) {
      return {
        passed: false,
        reason: `Post ${task.postId} has already been submitted (submitClicked=true). Cannot re-submit.`,
      };
    }
  }

  // Preflight passed（注意：这里不创建状态，由调用方决定何时创建）
  return { passed: true };
}

/**
 * Preflight 通过后，创建初始状态并获取 lock
 * 仅在真实发布模式下调用（mock 不创建）
 *
 * @param {object} task
 * @returns {{ ok: boolean, state?: object, reason?: string }}
 */
function initPublishState(task) {
  const { postId, content } = task;
  const body = content.body || '';
  const tags = content.tags || [];
  const assets = content.assets || [];

  // 计算 asset hashes
  const assetHashes = assets
    .filter((a) => a.url)
    .map((a) => {
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(a.url, 'utf8').digest('hex');
    });

  // 创建状态
  const state = createState({
    postId,
    title: content.title || '',
    tags,
    finalBody: body,
    assetHashes,
  });

  addEvent(postId, 'preflight_passed', 'Preflight check passed, state initialized', 'preparing');

  state.status = 'preparing';

  return { ok: true, state };
}

module.exports = { preflightCheck, initPublishState };
