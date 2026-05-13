const http = require('http');
const https = require('https');
const { URL } = require('url');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.OPENCLAW_PUBLISH_PORT || 18790;
const AUTH_TOKEN = process.env.OPENCLAW_PUBLISH_AUTH_TOKEN || 'openclaw-publish-2026-prod-token';
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://127.0.0.1:8000';
const USE_REAL_PUBLISH = process.env.USE_REAL_PUBLISH === 'true';
const DEFAULT_PROFILE_DIR = process.env.DEFAULT_XHS_PROFILE_DIR || '/root/.openclaw/xhs-profile-persist';

function getProfileDir(task) {
  return task.account?.profilePath || task.account?.profileDir || DEFAULT_PROFILE_DIR;
}

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

async function executeRealPublish(task) {
  const executionId = generateId('exec');
  const logs = ['Task received'];
  
  logs.push('Using real browser publish mode');
  
  try {
    // 调用 Python 脚本进行真实发布
    const contentJson = JSON.stringify({
      title: task.content?.title || '',
      body: task.content?.body || '',
      tags: task.content?.tags || []
    });
    
    logs.push('Starting browser automation');
    
    // 执行 Python 脚本
    const scriptPath = '/root/.openclaw/workspace/skills/xiaohongshu-publisher/xhs_publish.js';
    const result = execSync(`node "${scriptPath}" '${contentJson}'`, {
      encoding: 'utf-8',
      timeout: 60000,
      env: { ...process.env, XHS_PROFILE_DIR: getProfileDir(task) }
    });
    
    logs.push('Browser automation completed');
    
    const publishResult = JSON.parse(result);
    logs.push(...(publishResult.executionLogs || []));

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
    
    return {
      publishStatus: 'failed',
      operator: 'openclaw-publisher-real',
      detail: `Publish failed: ${error.message}`,
      errorMessage: error.message,
      failureType: 'retryable',
      executionLogs: logs
    };
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
    log(`Publish request: postId=${task.postId}`);
    
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
        await writebackResult(task, result);
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
      const scriptPath = path.join(__dirname, 'xhs_metrics.js');
      log(`Running metrics script: ${scriptPath} ${platformPostId}`);

      try {
        const result = execSync(`node "${scriptPath}" "${platformPostId}"`, {
          encoding: 'utf-8',
          timeout: 60000,
          env: {
            ...process.env,
            XHS_PROFILE_DIR: getProfileDir(body) || process.env.XHS_PROFILE_DIR || DEFAULT_PROFILE_DIR,
            XHS_HEADLESS: process.env.XHS_HEADLESS || 'true',
          },
        });

        const metricsResult = JSON.parse(result);
        log(`Metrics result: success=${metricsResult.success} errorCode=${metricsResult.errorCode || 'none'}`);

        if (metricsResult.success) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            views: metricsResult.views || 0,
            likes: metricsResult.likes || 0,
            favorites: metricsResult.favorites || 0,
            comments: metricsResult.comments || 0,
            followConversions: metricsResult.followConversions || 0,
          }));
        } else {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: metricsResult.errorMessage || 'Metrics fetch failed',
            errorCode: metricsResult.errorCode || 'metrics_fetch_failed',
          }));
        }
      } catch (execError) {
        const reason = execError.killed ? 'timeout' : execError.message;
        log(`Metrics script error: ${reason}`);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: `Metrics fetch failed: ${reason}`,
          errorCode: execError.killed ? 'metrics_fetch_timeout' : 'metrics_fetch_execution_error',
        }));
      }
    } else {
      // Mock mode: return simulated metrics
      log('Using mock metrics mode');
      const mockMetrics = {
        views: Math.floor(Math.random() * 500) + 100,
        likes: Math.floor(Math.random() * 50) + 10,
        favorites: Math.floor(Math.random() * 20) + 5,
        comments: Math.floor(Math.random() * 10) + 2,
        followConversions: Math.floor(Math.random() * 5),
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
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'healthy',
    service: 'openclaw-xiaohongshu-publisher',
    version: '2.0.0',
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
