#!/usr/bin/env node
/**
 * publish_lock.js — OpenClaw 发布 lock 管理
 *
 * 管理 /root/.openclaw/publish-locks/{postId}.lock 文件。
 * 每次真实发布前为 postId 创建 lock 文件，防止同 postId 重复发布。
 */

const fs = require('fs');
const path = require('path');

const LOCK_DIR = path.resolve('/root/.openclaw/publish-locks');
const ZOMBIE_THRESHOLD_MS = 30 * 60 * 1000; // 30 分钟

/**
 * 确保 lock 目录存在
 */
function ensureDir() {
  if (!fs.existsSync(LOCK_DIR)) {
    fs.mkdirSync(LOCK_DIR, { recursive: true });
  }
}

/**
 * 获取 lock 文件路径
 * @param {string} postId
 * @returns {string}
 */
function lockPath(postId) {
  // 防止目录穿越
  const safe = postId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(LOCK_DIR, `${safe}.lock`);
}

/**
 * 创建 lock 文件
 * @param {string} postId
 * @returns {{ acquired: boolean, reason?: string }}
 */
function acquireLock(postId) {
  ensureDir();
  const p = lockPath(postId);

  if (fs.existsSync(p)) {
    try {
      const existing = JSON.parse(fs.readFileSync(p, 'utf8'));

      // 检测僵尸 lock：超过 30 分钟且对应 pid 不存在
      const age = Date.now() - new Date(existing.startedAt).getTime();
      if (age > ZOMBIE_THRESHOLD_MS) {
        // 尝试检查 pid 是否存活
        try {
          process.kill(existing.pid, 0); // 发送信号 0 只检测存在性
          // pid 仍存活，但不应该锁这么久
        } catch {
          // pid 不存在 → 僵尸 lock，清理
          fs.unlinkSync(p);
          return createLockFile(postId);
        }
      }

      return { acquired: false, reason: `Lock already held by pid ${existing.pid} since ${existing.startedAt}. Use releaseLock first.` };
    } catch (e) {
      // 文件损坏，覆盖
      return createLockFile(postId);
    }
  }

  return createLockFile(postId);
}

/**
 * 内部：创建 lock 文件（假定不存在或已清理）
 * @param {string} postId
 * @returns {{ acquired: boolean }}
 */
function createLockFile(postId) {
  const p = lockPath(postId);
  const lock = {
    postId,
    startedAt: new Date().toISOString(),
    pid: process.pid,
  };
  fs.writeFileSync(p, JSON.stringify(lock, null, 2), 'utf8');
  return { acquired: true };
}

/**
 * 释放 lock 文件
 * @param {string} postId
 */
function releaseLock(postId) {
  const p = lockPath(postId);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
  }
}

/**
 * 检查 postId 是否已被锁定
 * @param {string} postId
 * @returns {boolean}
 */
function isLocked(postId) {
  const p = lockPath(postId);
  if (!fs.existsSync(p)) return false;

  try {
    const existing = JSON.parse(fs.readFileSync(p, 'utf8'));
    const age = Date.now() - new Date(existing.startedAt).getTime();
    // 超过30分钟且pid不存在视为未锁定
    if (age > ZOMBIE_THRESHOLD_MS) {
      try {
        process.kill(existing.pid, 0);
      } catch {
        return false; // 僵尸 lock
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * 清理所有僵尸 lock
 * @returns {number} 清理的数量
 */
function cleanZombieLocks() {
  ensureDir();
  let cleaned = 0;
  const files = fs.readdirSync(LOCK_DIR);

  for (const f of files) {
    if (!f.endsWith('.lock')) continue;
    const p = path.join(LOCK_DIR, f);
    try {
      const existing = JSON.parse(fs.readFileSync(p, 'utf8'));
      const age = Date.now() - new Date(existing.startedAt).getTime();

      if (age > ZOMBIE_THRESHOLD_MS) {
        try {
          process.kill(existing.pid, 0);
          // pid 存活但 lock 太老 — 也视为异常，清理
          fs.unlinkSync(p);
          cleaned++;
        } catch {
          // pid 不存在 → 清理
          fs.unlinkSync(p);
          cleaned++;
        }
      }
    } catch {
      // 文件损坏，直接清理
      try { fs.unlinkSync(p); } catch {}
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * 获取 lock 信息
 * @param {string} postId
 * @returns {object|null}
 */
function getLock(postId) {
  const p = lockPath(postId);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

module.exports = {
  acquireLock,
  releaseLock,
  isLocked,
  cleanZombieLocks,
  getLock,
};
