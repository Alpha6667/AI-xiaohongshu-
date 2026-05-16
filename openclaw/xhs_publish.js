#!/usr/bin/env node
/**
 * Xiaohongshu real publish script (Node.js)
 * Captures real noteId via network response interceptor.
 * Supports content.assets for multi-image upload:
 *   - assets[].url: local file path or http/https URL
 *   - HTTP/HTTPS URLs are downloaded to a temp directory first
 *   - All images uploaded via fileChooser.setFiles()
 *   - Content is passed via process.argv[2] as JSON
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const PROFILE_DIR = process.env.XHS_PROFILE_DIR || '/root/.openclaw/xhs-profile-persist';
const SCREENSHOT_DIR = process.env.XHS_SCREENSHOT_DIR || '/tmp/xhs-screenshots';
const HEADLESS = process.env.XHS_HEADLESS !== 'false';

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const logs = [];
function log(msg) {
  const ts = new Date().toISOString();
  logs.push(msg);
  console.error(`[${ts}] ${msg}`);
}

function findNoteInObj(obj, depth = 0) {
  if (depth > 6 || obj == null) return null;
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    for (const k of ['noteId', 'note_id', 'id', 'postId']) {
      const v = obj[k];
      if (typeof v === 'string' && v.length >= 8 && !v.startsWith('post_')) return v;
    }
    for (const v of Object.values(obj)) { const r = findNoteInObj(v, depth+1); if (r) return r; }
  } else if (Array.isArray(obj)) {
    for (const item of obj.slice(0, 20)) { const r = findNoteInObj(item, depth+1); if (r) return r; }
  }
  return null;
}

/**
 * Download a remote file via http/https to a temp directory.
 * Returns the local file path.
 */
function downloadFile(urlStr, destDir) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const isHttps = parsedUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    // Extract filename from URL
    const urlPath = parsedUrl.pathname;
    let filename = path.basename(urlPath);
    if (!filename || !filename.includes('.')) {
      filename = `download_${Date.now()}.png`;
    }
    // Sanitize filename
    filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    const destPath = path.join(destDir, filename);

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      timeout: 30000,
    };

    const req = httpModule.request(reqOptions, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        resolve(downloadFile(res.headers.location, destDir));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${res.statusCode} for ${urlStr}`));
        return;
      }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        log(`Downloaded: ${urlStr} -> ${destPath}`);
        resolve(destPath);
      });
      fileStream.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Download timeout for ${urlStr}`)); });
    req.end();
  });
}

/**
 * Resolve all asset URLs to local file paths.
 * Local paths are used as-is; HTTP/HTTPS URLs are downloaded.
 */
async function resolveAssetFiles(assets, tempDir) {
  const files = [];
  for (const asset of (assets || [])) {
    if (!asset.url) {
      log(`Skipping asset without url: ${JSON.stringify(asset)}`);
      continue;
    }
    const urlStr = asset.url;
    try {
      if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
        const localPath = await downloadFile(urlStr, tempDir);
        files.push(localPath);
      } else {
        // Local path
        if (fs.existsSync(urlStr)) {
          files.push(urlStr);
        } else {
          log(`Warning: asset file not found: ${urlStr}`);
        }
      }
    } catch (dlError) {
      throw Object.assign(dlError, { errorCode: 'media_download_failed', assetUrl: urlStr });
    }
  }
  return files;
}

/** Classify assets by contentType. Returns { images: [...], videos: [...] } */
function classifyAssets(assets) {
  const images = [];
  const videos = [];
  for (const a of (assets || [])) {
    const ct = (a.contentType || a.mimeType || '').toLowerCase();
    if (ct.startsWith('video/')) videos.push(a);
    else images.push(a);
  }
  return { images, videos };
}

async function publish(content) {
  log('Starting publish');
  const title = content.title || '';
  const body = content.body || '';
  const assets = content.assets || [];

  // Guard: reject video and mixed media (Phase 2 will add video support)
  const { images, videos } = classifyAssets(content.assets || []);
  if (videos.length > 0 && images.length > 0) {
    return { success: false, errorMessage: 'Mixed image and video assets are not supported', errorCode: 'unsupported_mixed_media', executionLogs: logs };
  }
  if (videos.length > 0) {
    return { success: false, errorMessage: 'Video publishing is not yet supported', errorCode: 'unsupported_media_type', executionLogs: logs };
  }

  // Normalize tags and append to body as #hashtags
  const tags = content.tags || [];
  const normalizedTags = Array.isArray(tags)
    ? [...new Set(tags.map((tag) => String(tag).trim().replace(/^#+/, '')).filter(Boolean))]
    : [];
  const tagSuffix = normalizedTags.length > 0
    ? '\n\n' + normalizedTags.map((tag) => `#${tag}`).join(' ')
    : '';
  const finalBody = `${body || ''}${tagSuffix}`;
  log(`Tags normalized: [${normalizedTags.join(', ')}] finalBody length=${finalBody.length}`);

  // Temp directory for downloaded images
  const tempDir = path.join(SCREENSHOT_DIR, 'assets_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  // Resolve asset files — local or downloaded
  const imageFiles = await resolveAssetFiles(assets, tempDir);
  log(`Resolved ${imageFiles.length} image(s) from ${assets.length} asset(s)`);

  // Fallback: if no assets provided, use TEST_IMAGE
  if (imageFiles.length === 0) {
    const testImage = process.env.XHS_TEST_IMAGE || '/root/.openclaw/media/test_upload_img.png';
    if (fs.existsSync(testImage)) {
      imageFiles.push(testImage);
      log('No assets provided, using TEST_IMAGE fallback');
    } else {
      log('Warning: No assets and TEST_IMAGE not found, proceeding without images');
    }
  }

  let browser;
  try {
    browser = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: HEADLESS,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'],
      viewport: { width: 1280, height: 900 }
    });
    log('Browser started with profile: ' + PROFILE_DIR);

    const pages = browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    // Step 1: Warm up
    log('Navigating to home page (session warmup)');
    try {
      await page.goto('https://creator.xiaohongshu.com/new/home', { waitUntil: 'load', timeout: 60000 });
    } catch (e) {
      log('Home page load timeout, continuing anyway');
    }
    await new Promise(r => setTimeout(r, 5000));
    const homeUrl = page.url();
    log(`Home URL: ${homeUrl}`);

    if (homeUrl.includes('/login') && !homeUrl.includes('/new/home')) {
      log('Login required (stuck on login)');
      await browser.close();
      return { success: false, errorMessage: 'Login required', failureType: 'non_retryable', executionLogs: logs };
    }
    log('Session warmed');

    // Step 2: Navigate to publish page
    log('Navigating to publish page');
    try {
      await page.goto('https://creator.xiaohongshu.com/publish/publish', { waitUntil: 'load', timeout: 60000 });
    } catch (e) {
      log('Publish page load timeout, continuing anyway');
    }
    await new Promise(r => setTimeout(r, 8000));
    const pubUrl = page.url();
    log(`Publish URL: ${pubUrl}`);

    // Step 3: Click "上传图文" tab
    log('Clicking 上传图文 tab');
    const clickR = await page.evaluate(() => {
      const tabs = document.querySelectorAll('.creator-tab');
      for (const tab of tabs) {
        if (tab.textContent.includes('上传图文') && !tab.classList.contains('active')) {
          tab.click(); return 'clicked_inactive';
        }
      }
      return 'not_found';
    });
    log(`Tab: ${clickR}`);
    await new Promise(r => setTimeout(r, 4000));

    // Step 4: Upload all images via filechooser
    log(`Uploading ${imageFiles.length} image(s)`);
    // Trigger file picker
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null),
      page.evaluate(() => { const i = document.querySelector('input[type="file"]'); if (i) i.click(); })
    ]);

    if (fileChooser) {
      // setFiles accepts single path or array
      await fileChooser.setFiles(imageFiles.length === 1 ? imageFiles[0] : imageFiles);
      log(`${imageFiles.length} image(s) uploaded`);
    } else {
      log('Warning: file chooser event not captured, trying upload anyway');
    }
    await new Promise(r => setTimeout(r, 8000));

    // Step 5: Verify editor
    const editor = await page.evaluate(() => ({
      ce: !!document.querySelector('[contenteditable="true"]'),
      inputs: document.querySelectorAll('input:not([type="file"]):not([type="hidden"])').length,
      btns: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim().substring(0, 30)),
    }));
    log(`Editor: ${JSON.stringify(editor)}`);

    if (!editor.ce) {
      await browser.close();
      return { success: false, errorMessage: 'Editor not loaded after upload', failureType: 'retryable', executionLogs: logs };
    }

    // Step 6: Fill title + body
    const fillR = await page.evaluate(({title, body: finalBody}) => {
      const r = {};
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      for (const inp of document.querySelectorAll('input:not([type="file"]):not([type="hidden"]):not([type="checkbox"])')) {
        if (inp.offsetParent) {
          setter.call(inp, title);
          inp.dispatchEvent(new Event('input', {bubbles: true}));
          inp.dispatchEvent(new Event('change', {bubbles: true}));
          r.title = 'filled_native';
          break;
        }
      }
      const ce = document.querySelector('[contenteditable="true"]');
      if (ce) {
        ce.focus();
        ce.innerHTML = finalBody;
        ce.dispatchEvent(new Event('input', {bubbles: true}));
        r.body = 'filled';
      }
      r.title = r.title || 'not_found';
      r.body = r.body || 'not_found';
      return r;
    }, {title, body: finalBody});
    log(`Fill: ${JSON.stringify(fillR)}`);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/content_filled.png`, fullPage: true });

    // Step 7: Network listener for noteId from publish API response
    let capturedNoteId = null;
    page.on('response', async (resp) => {
      if (resp.url().includes('/web_api/sns/v2/note')) {
        try {
          const json = JSON.parse(await resp.text());
          if (json.data && json.data.id) {
            capturedNoteId = json.data.id;
            log(`CAPTURED NOTE ID: ${capturedNoteId}`);
          }
        } catch (e) {}
      }
    });

    // Step 8: Click publish
    const pubR = await page.evaluate(() => {
      // Find publish button with text '发布笔记' or contains '发布'
      for (const sel of ['[class*=btn]', '[class*=publish]', 'button', 'div', 'span']) {
        for (const b of document.querySelectorAll(sel)) {
          const txt = (b.textContent || '').trim().replace(/\s+/g, '');
          if ((txt === '发布笔记' || txt === '发布') && b.offsetParent !== null) {
            b.click(); return 'clicked_' + sel;
          }
        }
      }
      return 'not_found';
    });
    log(`Publish click: ${pubR}`);

    // Wait for API response
    await new Promise(r => setTimeout(r, 5000));

    await browser.close();

    // Cleanup temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      log(`Temp cleanup warning: ${e.message}`);
    }

    if (capturedNoteId) {
      return { success: true, platformPostId: capturedNoteId, executionLogs: logs };
    }
    return { success: false, errorMessage: 'Publish failed: real noteId not captured from API response. The publish button was clicked but Xiaohongshu did not return a valid note ID, indicating the submission was intercepted or rejected.', errorCode: 'note_id_not_captured', failureType: 'retryable', executionLogs: logs };

  } catch (e) {
    log(`Error: ${e.message}`);
    if (browser) await browser.close().catch(() => {});
    // Cleanup temp directory
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (ex) {}
    // Classify error for appropriate errorCode
    const errorCode = e.errorCode
      || (e.message && e.message.includes('fileChooser') ? 'media_upload_failed' : null)
      || 'publish_execution_error';
    const failureType = errorCode === 'media_download_failed' || errorCode === 'media_upload_failed' ? 'non_retryable' : 'retryable';
    return { success: false, errorMessage: e.message, errorCode, failureType, executionLogs: logs };
  }
}

// CLI: content passed via process.argv[2] as JSON
const content = JSON.parse(process.argv[2] || '{}');
publish(content).then(r => {
  console.log(JSON.stringify(r));
  process.exit(0);
}).catch(e => {
  console.log(JSON.stringify({ success: false, errorMessage: e.message, executionLogs: logs }));
  process.exit(1);
});
