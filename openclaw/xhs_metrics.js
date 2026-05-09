#!/usr/bin/env node
/**
 * Xiaohongshu metrics fetcher (Node.js)
 * 
 * Navigates to creator note manager, finds the note by platformPostId,
 * and extracts interactive metrics from the DOM.
 * 
 * Returns JSON: { success, platformPostId, views, likes, favorites, comments, followConversions, executionLogs }
 */
const { chromium } = require('playwright');

const PROFILE_DIR = process.env.XHS_PROFILE_DIR || '/root/.openclaw/xhs-profile-persist';
const SCREENSHOT_DIR = process.env.XHS_SCREENSHOT_DIR || '/tmp/xhs-screenshots';
const HEADLESS = process.env.XHS_HEADLESS !== 'false';
const TIMEOUT_MS = parseInt(process.env.XHS_METRICS_TIMEOUT_MS || '60000');

const fs = require('fs');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const logs = [];
function log(msg) { const ts = new Date().toISOString(); logs.push(msg); console.error(`[${ts}] ${msg}`); }

function parseCount(text) {
  if (!text) return 0;
  text = text.trim().replace(/,/g, '').replace(/ /g, '');
  if (text.endsWith('万')) return Math.round(parseFloat(text) * 10000) || 0;
  return parseInt(text) || 0;
}

async function fetchMetrics(platformPostId) {
  log(`Fetching metrics for ${platformPostId}`);

  let browser;
  try {
    browser = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: HEADLESS,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'],
      viewport: { width: 1280, height: 900 }
    });
    log('Browser started');

    const pages = browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    // Warm up
    log('Warming up session');
    await page.goto('https://creator.xiaohongshu.com/new/home', { waitUntil: 'load', timeout: TIMEOUT_MS });
    await new Promise(r => setTimeout(r, 3000));
    if (page.url().includes('/login') && !page.url().includes('/new/home')) {
      log('Login required');
      await browser.close();
      return { success: false, errorCode: 'metrics_fetch_login_required', errorMessage: '需要重新登录', executionLogs: logs };
    }
    log('Session OK');

    // Navigate to note manager
    log('Navigating to note manager');
    await page.goto('https://creator.xiaohongshu.com/new/note-manager', { waitUntil: 'load', timeout: TIMEOUT_MS });
    await new Promise(r => setTimeout(r, 8000));
    log(`Note manager: ${page.url()}`);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/metrics_${platformPostId}.png` });

    // Extract metrics — find note card by platformPostId or title match
    const metrics = await page.evaluate((pid) => {
      // All note cards: divs with class "info" that contain a title and icon_list
      const infoDivs = document.querySelectorAll('.info');
      const results = [];
      
      for (const info of infoDivs) {
        const titleEl = info.querySelector('.title');
        const title = titleEl ? titleEl.textContent.trim() : '';
        const timeEl = info.querySelector('.time');
        const time = timeEl ? timeEl.textContent.trim() : '';

        // Get all icon spans (the number after each SVG icon)
        const iconSpans = info.querySelectorAll('.icon span');
        const nums = Array.from(iconSpans).map(s => s.textContent.trim());

        // Look for data-id or data-note-id attributes anywhere in the card
        const card = info.closest('[data-id], [data-note-id]');
        const dataId = card ? (card.getAttribute('data-id') || card.getAttribute('data-note-id') || '') : '';
        
        results.push({
          title: title.substring(0, 60),
          time: time.substring(0, 30),
          nums,
          dataId
        });
      }

      // Try to match by data-id first
      for (const r of results) {
        if (r.dataId && r.dataId.includes(pid)) {
          return { source: 'data_id', metrics: r, all: results };
        }
      }

      // Try to match by title containing key words from the last publish
      // (the most recent note is the first one in the list)
      if (results.length > 0) {
        return { source: 'first_card', metrics: results[0], all: results };
      }

      return { source: 'none', metrics: null, all: results };
    }, platformPostId);

    log(`Note cards found: ${metrics.all.length}, source: ${metrics.source}`);

    if (!metrics.metrics || !metrics.metrics.nums || metrics.metrics.nums.length < 4) {
      log('No metrics found in DOM');
      await browser.close();
      return { success: false, errorCode: 'metrics_fetch_note_not_found', errorMessage: '笔记未找到或数据不完整', executionLogs: logs };
    }

    const nums = metrics.metrics.nums;
    const result = {
      views: parseCount(nums[0] || '0'),
      comments: parseCount(nums[1] || '0'),
      favorites: parseCount(nums[2] || '0'),
      likes: parseCount(nums[3] || '0'),
      followConversions: parseCount(nums[4] || '0'),
    };

    log(`Metrics: views=${result.views} likes=${result.likes} favorites=${result.favorites} comments=${result.comments} follow=${result.followConversions}`);
    
    await browser.close();
    return { success: true, platformPostId, ...result, executionLogs: logs };

  } catch (e) {
    log(`Error: ${e.message}`);
    if (browser) await browser.close().catch(() => {});
    return { success: false, errorCode: 'metrics_fetch_page_error', errorMessage: e.message, executionLogs: logs };
  }
}

// CLI
const pid = process.argv[2];
if (!pid) {
  console.log(JSON.stringify({ success: false, errorCode: 'missing_argument', errorMessage: 'platformPostId required' }));
  process.exit(1);
}
fetchMetrics(pid).then(r => { console.log(JSON.stringify(r)); process.exit(0); }).catch(e => { console.log(JSON.stringify({ success: false, errorMessage: e.message, executionLogs: logs })); process.exit(1); });
