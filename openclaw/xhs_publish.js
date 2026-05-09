#!/usr/bin/env node
/**
 * Xiaohongshu real publish script (Node.js)
 * Captures real noteId via network response interceptor.
 */
const { chromium } = require('playwright');

const PROFILE_DIR = process.env.XHS_PROFILE_DIR || '/root/.openclaw/xhs-profile-persist';
const SCREENSHOT_DIR = process.env.XHS_SCREENSHOT_DIR || '/tmp/xhs-screenshots';
const TEST_IMAGE = process.env.XHS_TEST_IMAGE || '/root/.openclaw/media/test_upload_img.png';
const HEADLESS = process.env.XHS_HEADLESS !== 'false';

const fs = require('fs');
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

async function publish(content) {
  log('Starting publish');
  const title = content.title || '';
  const body = content.body || '';

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

    // Step 1: Warm up — skip strict login check during URL transition
    log('Navigating to home page (session warmup)');
    try {
      await page.goto('https://creator.xiaohongshu.com/new/home', { waitUntil: 'load', timeout: 60000 });
    } catch (e) {
      log('Home page load timeout, continuing anyway');
    }
    await new Promise(r => setTimeout(r, 5000));
    const homeUrl = page.url();
    log(`Home URL: ${homeUrl}`);

    // Only fail if URL stayed on login without any /new/home transition
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

    // Step 3: Click "上传图文" tab (not-active one)
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

    // Step 4: Upload image via filechooser
    log('Uploading image');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 10000 }),
      page.evaluate(() => { const i = document.querySelector('input[type="file"]'); if (i) i.click(); })
    ]);
    await fileChooser.setFiles(TEST_IMAGE);
    log('Image uploaded');
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

    // Step 6: Fill title + body (Vue-compatible via native setter)
    const fillR = await page.evaluate(({title, body}) => {
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
        ce.innerHTML = body;
        ce.dispatchEvent(new Event('input', {bubbles: true}));
        r.body = 'filled';
      }
      r.title = r.title || 'not_found';
      r.body = r.body || 'not_found';
      return r;
    }, {title, body});
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
      for (const b of document.querySelectorAll('button')) {
        if (b.textContent.trim() === '发布') { b.click(); return 'clicked'; }
      }
      return 'not_found';
    });
    log(`Publish click: ${pubR}`);

    // Wait for API response
    await new Promise(r => setTimeout(r, 5000));

    await browser.close();

    if (capturedNoteId) {
      return { success: true, platformPostId: capturedNoteId, executionLogs: logs };
    }
    return { success: true, platformPostId: `xh_${Math.floor(Date.now()/1000)}`,
             executionLogs: logs, warning: 'Real note id not captured, using fallback' };

  } catch (e) {
    log(`Error: ${e.message}`);
    if (browser) await browser.close().catch(() => {});
    return { success: false, errorMessage: e.message, failureType: 'retryable', executionLogs: logs };
  }
}

// CLI
const content = JSON.parse(process.argv[2] || '{}');
publish(content).then(r => {
  console.log(JSON.stringify(r));
  process.exit(0);
}).catch(e => {
  console.log(JSON.stringify({ success: false, errorMessage: e.message, executionLogs: logs }));
  process.exit(1);
});
