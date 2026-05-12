const http = require('http');
const https = require('https');
const { URL } = require('url');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.OPENCLAW_PUBLISH_PORT || 18790;

// 持久化模块
const { addEvent, readState, setPlatformPostId, markFailed, markCompleted, isSubmitClicked } = require('./publisher/publish_state');
const { acquireLock, releaseLock, cleanZombieLocks } = require('./publisher/publish_lock');
const { preflightCheck, initPublishState } = require('./publisher/xhs_preflight');

// Item 1: No default value — fail if not set
if (!process.env.OPENCLAW_PUBLISH_AUTH_TOKEN) {
  console.error('[FATAL] OPENCLAW_PUBLISH_AUTH_TOKEN is not set. Exiting.');
  process.exit(1);
}
const AUTH_TOKEN = process.env.OPENCLAW_PUBLISH_AUTH_TOKEN;

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://127.0.0.1:8000';
const USE_REAL_PUBLISH = process.env.USE_REAL_PUBLISH === 'true';

const executions = new Map();

function generateId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function checkAuth(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  return token === AUTH_TOKEN;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function httpRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'POST',
      headers: { 'Content-Type': 'application/json', ...options.headers }
    };
    
    const req = httpModule.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Run a Node.js script with spawn and receive output via pipes.
 * Returns { stdout, stderr, code }.
 */
function runScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: path.dirname(scriptPath),
      env: {
        ...process.env,
        // Item 5: Do not force-override XHS_PROFILE_DIR, only set a default
        XHS_PROFILE_DIR: process.env.XHS_PROFILE_DIR || '/root/.openclaw/xhs-profile-persist',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    child.on('close', (code) => {
      resolve({ stdout, stderr, code });
    });

    child.on('error', reject);
  });
}

async function executeRealPublish(task) {
  const executionId = generateId('exec');
  const logs = ['Task received'];
  const postId = task.postId;
  
  logs.push('Using real browser publish mode');

  // === Preflight + Lock + State Init ===
  // Step 1: Preflight check
  const check = preflightCheck(task);
  if (!check.passed) {
    logs.push(`Preflight rejected: ${check.reason}`);
    return {
      publishStatus: 'rejected',
      operator: 'openclaw-publisher-real',
      detail: check.reason,
      platformPostId: check.platformPostId || null,
      executionLogs: logs
    };
  }
  logs.push('Preflight check passed');

  // Step 2: Initialize publish state (creates state file)
  const init = initPublishState(task);
  if (!init.ok) {
    logs.push(`State init failed: ${init.reason}`);
    return {
      publishStatus: 'failed',
      operator: 'openclaw-publisher-real',
      detail: init.reason,
      executionLogs: logs
    };
  }
  logs.push('Publish state initialized');

  // Step 3: Acquire lock
  const lock = acquireLock(postId);
  if (!lock.acquired) {
    logs.push(`Lock acquisition failed: ${lock.reason}`);
    markFailed(postId, lock.reason);
    releaseLock(postId);
    return {
      publishStatus: 'rejected',
      operator: 'openclaw-publisher-real',
      detail: lock.reason,
      executionLogs: logs
    };
  }
  addEvent(postId, 'lock_acquired', `Lock acquired by pid ${process.pid}`, 'publishing');
  logs.push('Lock acquired');
  
  try {
    // Item 6: Pass the full content including assets via JSON string on CLI
    const contentJson = JSON.stringify({
      title: task.content?.title || '',
      body: task.content?.body || '',
      tags: task.content?.tags || [],
      assets: task.content?.assets || []
    });
    
    logs.push('Starting browser automation');
    addEvent(postId, 'browser_started', 'Browser launch initiated');
    
    // Items 3 & 4: Use path.join + spawn (argument array, no string injection)
    const scriptPath = path.join(__dirname, 'xhs_publish.js');
    const result = await runScript(scriptPath, [contentJson]);
    
    if (result.code !== 0) {
      logs.push(`Script exited with code ${result.code}`);
      throw new Error(result.stderr || `Script exited with code ${result.code}`);
    }
    
    logs.push('Browser automation completed');
    
    const publishResult = JSON.parse(result.stdout);
    logs.push(...(publishResult.executionLogs || []));

    // === Persistence: Record publish result ===
    if (publishResult.success) {
      // submit_clicked event
      addEvent(postId, 'submit_clicked', 'Publish button was clicked', 'submit_clicked');

      if (publishResult.platformPostId) {
        setPlatformPostId(postId, publishResult.platformPostId);
        addEvent(postId, 'platform_id_detected', `Platform post id: ${publishResult.platformPostId}`);
      }

      // Mark completed (will be overridden to callback_pending if writeback fails later)
      markCompleted(postId, publishResult.platformPostId || null);
    } else {
      // Publish failed
      markFailed(postId, publishResult.errorMessage || 'Unknown publish failure');
    }

    const detailParts = [];
    if (publishResult.success) {
      detailParts.push('Published successfully');
      if (publishResult.warning) {
        detailParts.push(`[warning: ${publishResult.warning}]`);
      }
    } else {
      detailParts.push(publishResult.errorMessage || 'Publish failed');
    }
    if (publishResult.platformPostId) {
      detailParts.push(`note_id=${publishResult.platformPostId}`);
    }
    
    return {
      publishStatus: publishResult.success ? 'succeeded' : 'failed',
      operator: 'openclaw-publisher-real',
      detail: detailParts.join(' '),
      platformPostId: publishResult.platformPostId,
      errorMessage: publishResult.errorMessage,
      failureType: publishResult.failureType,
      executionLogs: logs
    };
    
  } catch (error) {
    logs.push(`Error: ${error.message}`);

    // === If we got an error but already have state (e.g. during browser automation) ===
    if (postId) {
      const currentState = readState(postId);
      if (currentState) {
        // platformPostId might have been set before the error
        const existingPlatformId = currentState.platformPostId;
        if (existingPlatformId) {
          // Was the publish actually submitted? If we have a platformPostId but callback failed
          if (currentState.submitClicked) {
            // Mark as callback_pending — only callback retry, no re-publish
            addEvent(postId, 'failed', `Callback pending: ${error.message}`, 'callback_pending');
            setPlatformPostId(postId, existingPlatformId);
          } else {
            markFailed(postId, error.message);
          }
        } else {
          markFailed(postId, error.message);
        }
      }
    }
    
    return {
      publishStatus: 'failed',
      operator: 'openclaw-publisher-real',
      detail: `Publish failed: ${error.message}`,
      platformPostId: postId ? (readState(postId) || {}).platformPostId : null,
      errorMessage: error.message,
      failureType: 'retryable',
      executionLogs: logs
    };
  } finally {
    // Always release lock when done (success or failure)
    if (postId) {
      releaseLock(postId);
      logs.push('Lock released');
    }
  }
}

async function executeMockPublish(task) {
  const logs = ['Task received'];
  
  logs.push('Using mock publish mode');
  logs.push('Browser started');
  await new Promise(r => setTimeout(r, 500));
  logs.push('Login verified');
  await new Promise(r => setTimeout(r, 300));
  logs.push('Content filled');
  await new Promise(r => setTimeout(r, 400));
  logs.push('Published');
  
  // Mock 模式下不创建持久化状态
  return {
    publishStatus: 'succeeded',
    operator: 'openclaw-publisher-mock',
    detail: 'Published successfully (mock)',
    platformPostId: `xh_${generateId('post')}`,
    executionLogs: logs
  };
}

async function writebackResult(task, result) {
  if (!task.callback?.publishResultUrl) {
    log('No callback URL, skip writeback');
    return;
  }
  
  try {
    log(`Writing back to: ${task.callback.publishResultUrl}`);
    const headers = task.callback.authToken ? { 'Authorization': `Bearer ${task.callback.authToken}` } : {};
    const response = await httpRequest(task.callback.publishResultUrl, { method: 'POST', headers }, result);
    log(`Writeback response: ${JSON.stringify(response)}`);
    return response;
  } catch (error) {
    log(`Writeback failed: ${error.message}`);
    throw error;
  }
}

async function handlePublish(req, res) {
  if (!checkAuth(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }
  
  try {
    const task = await parseBody(req);
    log(`Publish request: postId=${task.postId} callback.publishResultUrl=${task.callback?.publishResultUrl || '(none)'} callback.metricsUrl=${task.callback?.metricsUrl || '(none)'}`);
    
    if (!task.postId || !task.content) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing required fields' }));
      return;
    }
    
    const executionId = generateId('exec');
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      publishStatus: 'queued',
      detail: 'Publish task accepted',
      executionId,
      executedAt: new Date().toISOString()
    }));
    
    setImmediate(async () => {
      try {
        // 发布前先调 backend publish 接口把 post 状态切到 publishing
        if (task.callback?.publishResultUrl) {
          const publishUrl = task.callback.publishResultUrl.replace('/publish-result', '/publish');
          try {
            log('Preparing publish on backend: ' + publishUrl);
            await httpRequest(publishUrl, { method: 'POST', headers: task.callback.authToken ? { 'Authorization': 'Bearer ' + task.callback.authToken } : {} }, { comment: 'OpenClaw publisher', operator: 'openclaw' });
          } catch (e) { log('Publish prepare warning: ' + e.message); }
        }

        const result = USE_REAL_PUBLISH ? await executeRealPublish(task) : await executeMockPublish(task);

        // === Writeback error → callback_pending handling ===
        if (result.publishStatus === 'succeeded' || result.publishStatus === 'failed') {
          try {
            await writebackResult(task, result);
            // If writeback succeeded and we have state with platformPostId, mark callback as confirmed
            if (USE_REAL_PUBLISH && task.postId) {
              const state = readState(task.postId);
              if (state && state.platformPostId) {
                if (state.status !== 'failed') {
                  addEvent(task.postId, 'callback_sent', 'Writeback sent to backend');
                  addEvent(task.postId, 'callback_confirmed', 'Writeback confirmed');
                }
              }
            }
          } catch (writebackError) {
            log(`Writeback failed: ${writebackError.message}`);
            if (USE_REAL_PUBLISH && task.postId) {
              const state = readState(task.postId);
              const platformPostId = result.platformPostId || (state ? state.platformPostId : null);
              if (platformPostId) {
                // 有 platformPostId 但 callback 失败 → callback_pending
                log(`Setting state to callback_pending for postId=${task.postId} platformPostId=${platformPostId}`);
                addEvent(task.postId, 'callback_sent', `Writeback attempt failed: ${writebackError.message}`);
                addEvent(task.postId, 'failed', `Callback failed, platformPostId preserved: ${platformPostId}`, 'callback_pending');
              }
            }
          }
        } else {
          // rejected 状态仍然回传
          try { await writebackResult(task, result); } catch (e) { log('Writeback error for rejected: ' + e.message); }
        }
      } catch (error) {
        log(`Execution failed: ${error.message}`);
      }
    });
    
  } catch (error) {
    log(`Error: ${error.message}`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

async function handleMetrics(req, res) {
  if (!checkAuth(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized', errorCode: 'auth_failed' }));
    return;
  }

  try {
    const body = await parseBody(req);
    const { postId, platformPostId } = body;

    if (!platformPostId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'platformPostId is required', errorCode: 'missing_required_field' }));
      return;
    }

    log(`Metrics request: postId=${postId} platformPostId=${platformPostId}`);

    if (USE_REAL_PUBLISH) {
      // Items 3 & 4: Use path.join + spawn (argument array, no string injection)
      const scriptPath = path.join(__dirname, 'xhs_metrics.js');
      log(`Running metrics script: ${scriptPath} ${platformPostId}`);

      try {
        let result = await runScript(scriptPath, [platformPostId]);

        if (result.code !== 0) {
          log(`Metrics script exited with code ${result.code}, retrying once...`);
          result = await runScript(scriptPath, [platformPostId]);
        }

        if (result.code !== 0) {
          throw new Error(result.stderr || `Script exited with code ${result.code}`);
        }

        const metricsResult = JSON.parse(result.stdout);
        log(`Metrics result: success=${metricsResult.success} errorCode=${metricsResult.errorCode || 'none'}`);

        if (metricsResult.success) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            views: metricsResult.views || 0,
            likes: metricsResult.likes || 0,
            favorites: metricsResult.favorites || 0,
            comments: metricsResult.comments || 0,
            followConversions: metricsResult.followConversions || 0,
            source: metricsResult.source || 'xhs_creator_center',
            capturedAt: metricsResult.capturedAt || new Date().toISOString(),
            matchedBy: metricsResult.matchedBy,
          }));
        } else {
          const statusCode = (
            metricsResult.errorCode === 'login_required' ? 401 :
            metricsResult.errorCode === 'post_not_found' ? 404 :
            metricsResult.errorCode === 'page_structure_changed' ? 502 :
            metricsResult.errorCode === 'metrics_unavailable' ? 503 :
            502
          );
          res.writeHead(statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: metricsResult.error || metricsResult.errorMessage || 'Metrics fetch failed',
            errorCode: metricsResult.errorCode || 'metrics_fetch_failed',
            source: metricsResult.source || 'xhs_creator_center',
            capturedAt: metricsResult.capturedAt || new Date().toISOString(),
          }));
        }
      } catch (execError) {
        const reason = execError.killed ? 'timeout' : execError.message;
        const errorCode = execError.killed ? 'metrics_fetch_timeout' : 'metrics_fetch_execution_error';
        log(`Metrics script error: ${reason}`);
        const statusCode = errorCode === 'metrics_fetch_timeout' ? 504 : 502;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: `Metrics fetch failed: ${reason}`,
          errorCode,
          source: 'xhs_creator_center',
        }));
      }
    } else {
      // Mock mode — return synthetic data with source=mock + capturedAt
      log('Using mock metrics mode');
      const mockMetrics = {
        views: Math.floor(Math.random() * 500) + 100,
        likes: Math.floor(Math.random() * 50) + 10,
        favorites: Math.floor(Math.random() * 20) + 5,
        comments: Math.floor(Math.random() * 10) + 2,
        followConversions: Math.floor(Math.random() * 5),
        source: 'mock',
        capturedAt: new Date().toISOString(),
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockMetrics));
    }

  } catch (error) {
    log(`Metrics error: ${error.message}`);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message, errorCode: 'invalid_request' }));
  }
}

function handleHealth(req, res) {
  const zombies = cleanZombieLocks();
  if (zombies > 0) {
    log(`Cleaned ${zombies} zombie lock(s)`);
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'healthy',
    service: 'openclaw-xiaohongshu-publisher',
    version: '2.1.0',
    realPublish: USE_REAL_PUBLISH
  }));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  log(`${req.method} ${url.pathname}`);
  
  if (req.method === 'POST' && url.pathname === '/api/openclaw/publish') {
    await handlePublish(req, res);
  } else if (req.method === 'POST' && url.pathname === '/api/openclaw/metrics') {
    await handleMetrics(req, res);
  } else if (req.method === 'GET' && url.pathname === '/health') {
    handleHealth(req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  log(`Publisher running on port ${PORT}`);
  log(`Real publish mode: ${USE_REAL_PUBLISH}`);
});

process.on('SIGTERM', () => {
  log('Shutting down...');
  server.close(() => process.exit(0));
});
