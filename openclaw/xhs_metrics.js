#!/usr/bin/env node
/**
 * Xiaohongshu metrics fetcher (Node.js)
 *
 * Strategy:
 *   1. Navigate to creator note-manager list page
 *   2. Collect all note cards with nums from DOM
 *   3. Click each card to enter detail page, extract noteId from URL (id=XXX)
 *   4. Match by platformPostId
 *   5. Fallback: click-based matching vs first_card
 *
 * Error codes:
 *   login_required, post_not_found, page_structure_changed,
 *   metrics_unavailable, metrics_fetch_timeout, metrics_fetch_execution_error
 *
 * Returns JSON with { success, platformPostId, views, likes, favorites,
 *   comments, followConversions, source, capturedAt, matchedBy, warning }
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

function nowISO() {
  return new Date().toISOString();
}

async function fetchMetrics(platformPostId) {
  log(`Fetching metrics for ${platformPostId}`);

  let browser;
  try {
    browser = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      viewport: { width: 1280, height: 900 },
    });
    log('Browser started');

    const pages = browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    // ---- Warm-up / login check ----
    log('Warming up session');
    await page.goto('https://creator.xiaohongshu.com/new/home', {
      waitUntil: 'load',
      timeout: TIMEOUT_MS,
    });
    await new Promise((r) => setTimeout(r, 3000));
    if (page.url().includes('/login')) {
      log('Login required');
      await browser.close();
      return { success: false, error: 'Login required', errorCode: 'login_required', source: 'xhs_creator_center', capturedAt: nowISO(), executionLogs: logs };
    }
    log('Session OK');

    // ---- Step 1: Gather card data from note-manager list ----
    log('Navigating to note manager');
    await page.goto('https://creator.xiaohongshu.com/new/note-manager', {
      waitUntil: 'load',
      timeout: TIMEOUT_MS,
    });
    await new Promise((r) => setTimeout(r, 8000));
    log(`Note manager: ${page.url()}`);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/metrics_${platformPostId}.png` });

    // ---- Step 2: Collect all cards ----
    const cardsOnList = await page.evaluate(() => {
      const results = [];
      const infoDivs = document.querySelectorAll('.info');
      for (const info of infoDivs) {
        const titleEl = info.querySelector('.title');
        const title = titleEl ? titleEl.textContent.trim() : '';
        const timeEl = info.querySelector('.time');
        const time = timeEl ? timeEl.textContent.trim() : '';
        const iconSpans = info.querySelectorAll('.icon span');
        const nums = Array.from(iconSpans).map((s) => s.textContent.trim());
        results.push({ title: title.substring(0, 60), time: time.substring(0, 60), nums, dataId: '' });
      }
      return results;
    });

    log(`Collected ${cardsOnList.length} cards from list`);

    if (cardsOnList.length === 0) {
      await browser.close();
      return { success: false, error: 'No note cards found', errorCode: 'page_structure_changed', source: 'xhs_creator_center', capturedAt: nowISO(), executionLogs: logs };
    }

    // ---- Step 3: Click cards one by one to find noteId match ----
    // Clicks each card, extracts noteId from URL, stops on first match.
    log('Searching for matching card by noteId...');
    let matchResult = null;

    for (let i = 0; i < cardsOnList.length; i++) {
      const card = cardsOnList[i];

      // Relocate the ith info element in current DOM
      const infoDivs = await page.$$('.info');
      if (i >= infoDivs.length) {
        log(`  Card #${i} not found, skipping`);
        continue;
      }

      log(`  Trying card #${i}: "${card.title}"`);

      try {
        await infoDivs[i].scrollIntoViewIfNeeded();
        const navPromise = page.waitForNavigation({ timeout: 20000 }).catch(() => {});
        await infoDivs[i].click();
        await navPromise;
        await new Promise((r) => setTimeout(r, 3000));

        const currentUrl = page.url();
        const noteId = new URL(currentUrl).searchParams.get('id') || '';
        log(`    noteId=${noteId}`);

        if (noteId === platformPostId) {
          log(`    *** MATCH FOUND: card #${i}`);
          matchResult = {
            matchedBy: 'note_id',
            cardIndex: i,
            card,
            noteId,
          };
          // No need to go back to list — we already have our data
          break;
        }

        // Return to note-manager for the next card
        await page.goto('https://creator.xiaohongshu.com/new/note-manager', { waitUntil: 'load', timeout: TIMEOUT_MS }).catch(() => {});
        await new Promise((r) => setTimeout(r, 3000));

      } catch (e) {
        log(`    Card #${i} click failed: ${e.message}`);
        await page.goto('https://creator.xiaohongshu.com/new/note-manager', { waitUntil: 'load', timeout: TIMEOUT_MS }).catch(() => {});
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    // ---- Step 4: Handle match result ----
    if (matchResult) {
      const nums = matchResult.card.nums;
      if (!nums || nums.length < 4) {
        await browser.close();
        return { success: false, error: 'Metrics data incomplete', errorCode: 'metrics_unavailable', source: 'xhs_creator_center', capturedAt: nowISO(), executionLogs: logs };
      }

      const capturedAt = nowISO();
      const result = {
        success: true,
        platformPostId,
        // SVG path confirmed order:
        //   nums[0] = 浏览 (eye)     -> views
        //   nums[1] = 评论 (bubble)   -> comments
        //   nums[2] = 点赞 (heart)    -> likes
        //   nums[3] = 收藏 (bookmark) -> favorites
        //   nums[4] = 转发 (arrow)    -> followConversions
        views: parseCount(nums[0] || '0'),
        comments: parseCount(nums[1] || '0'),
        likes: parseCount(nums[2] || '0'),
        favorites: parseCount(nums[3] || '0'),
        followConversions: parseCount(nums[4] || '0'),
        source: 'xhs_creator_center',
        capturedAt,
        matchedBy: matchResult.matchedBy,
        matchedTitle: matchResult.card.title || '',
        executionLogs: logs,
      };

      log(`Precision match via ${matchResult.matchedBy}: card #${matchResult.cardIndex}`);
      log(`Metrics: views=${result.views} likes=${result.likes} fav=${result.favorites} cmt=${result.comments} follow=${result.followConversions}`);

      await browser.close();
      return result;
    }

    // ---- Step 5: Fallback — first_card with warning ----
    log(`WARNING: No card matched platformPostId ${platformPostId}, falling back to first_card`);
    const firstCard = cardsOnList[0];
    if (!firstCard || !firstCard.nums || firstCard.nums.length < 4) {
      await browser.close();
      return { success: false, error: 'No matching card found and fallback card has incomplete data', errorCode: 'post_not_found', source: 'xhs_creator_center', capturedAt: nowISO(), executionLogs: logs };
    }

    const nums = firstCard.nums;
    const capturedAt = nowISO();
    const result = {
      success: true,
      platformPostId,
      // SVG path confirmed order (same as precision match above)
      views: parseCount(nums[0] || '0'),
      comments: parseCount(nums[1] || '0'),
      likes: parseCount(nums[2] || '0'),
      favorites: parseCount(nums[3] || '0'),
      followConversions: parseCount(nums[4] || '0'),
      source: 'xhs_creator_center',
      capturedAt,
      matchedBy: 'first_card',
      warning: '由于页面未暴露data-id属性，无法按platformPostId精准定位笔记；可能匹配到同名多版本中的其他帖子',
      matchedTitle: firstCard.title || '',
      executionLogs: logs,
    };

    log(`Fallback first_card: title="${firstCard.title}" nums=${JSON.stringify(nums)}`);
    log(`Metrics: views=${result.views} likes=${result.likes} fav=${result.favorites} cmt=${result.comments} follow=${result.followConversions}`);

    await browser.close();
    return result;

  } catch (e) {
    log(`Error: ${e.message}`);
    if (browser) await browser.close().catch(() => {});
    const errorCode = (e.message && e.message.includes('timeout')) ? 'metrics_fetch_timeout' : 'metrics_fetch_execution_error';
    return { success: false, error: e.message, errorCode, source: 'xhs_creator_center', executionLogs: logs };
  }
}

const pid = process.argv[2];
if (!pid) {
  console.log(JSON.stringify({ success: false, error: 'platformPostId argument is required', errorCode: 'missing_argument', source: 'xhs_creator_center' }));
  process.exit(1);
}
fetchMetrics(pid)
  .then((r) => { console.log(JSON.stringify(r)); process.exit(0); })
  .catch((e) => { console.log(JSON.stringify({ success: false, error: e.message, errorCode: 'metrics_fetch_execution_error', source: 'xhs_creator_center', executionLogs: logs })); process.exit(1); });
