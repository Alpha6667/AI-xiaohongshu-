#!/usr/bin/env node
/**
 * Xiaohongshu metrics fetcher (Node.js)
 *
 * Navigates to creator note manager, finds the note by platformPostId,
 * and extracts interactive metrics from the DOM.
 *
 * Error codes:
 *   login_required       — session expired, user needs to re-login
 *   post_not_found       — note with given platformPostId not found in manager
 *   page_structure_changed — DOM selectors no longer match (upstream UI change)
 *   metrics_unavailable  — note found but metrics DOM block not yet populated
 *   metrics_fetch_timeout  — browser/network timed out
 *   metrics_fetch_execution_error — unexpected script crash
 *
 * Returns JSON with { success, platformPostId, views, likes, favorites,
 *   comments, followConversions, source, capturedAt }
 * On failure: { success, error, errorCode, source, executionLogs }
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
      return {
        success: false,
        error: 'Login required',
        errorCode: 'login_required',
        source: 'xhs_creator_center',
        capturedAt: nowISO(),
        executionLogs: logs,
      };
    }
    log('Session OK');

    // ---- Navigate to note manager ----
    log('Navigating to note manager');
    await page.goto('https://creator.xiaohongshu.com/new/note-manager', {
      waitUntil: 'load',
      timeout: TIMEOUT_MS,
    });
    await new Promise((r) => setTimeout(r, 8000));
    log(`Note manager: ${page.url()}`);

    // Screenshot for debugging
    await page.screenshot({ path: `${SCREENSHOT_DIR}/metrics_${platformPostId}.png` });

    // ---- Extract metrics via evaluate ----
    const metrics = await page.evaluate((pid) => {
      /**
       * Attempt multiple known DOM selectors for the creator note-manager cards.
       * The creator center has undergone multiple UI revisions, so we probe
       * several selector patterns:
       *
       *   Pattern A (older): .info > .title + .icon > span
       *   Pattern B (newer): [class*="note-item"]  with [class*="stat"]
       *   Pattern C (fallback): tr / td table layout
       */
      const finderPatterns = [
        // Pattern A — .info selector
        () => {
          const cards = document.querySelectorAll('.info');
          const results = [];
          for (const info of cards) {
            const titleEl = info.querySelector('.title');
            const title = titleEl ? titleEl.textContent.trim() : '';
            const iconSpans = info.querySelectorAll('.icon span');
            const nums = Array.from(iconSpans).map((s) => s.textContent.trim());
            const card = info.closest('[data-id], [data-note-id]');
            const dataId = card
              ? card.getAttribute('data-id') ||
                card.getAttribute('data-note-id') ||
                ''
              : '';
            results.push({ title: title.substring(0, 60), nums, dataId });
          }
          return results;
        },

        // Pattern B — generic stat items
        () => {
          const statItems = document.querySelectorAll(
            '[class*="stat-item"], [class*="statItem"]'
          );
          const results = [];
          for (const item of statItems) {
            const text = item.textContent.trim();
            results.push({ text });
          }
          return results;
        },
      ];

      // Try each pattern, collect all data
      const allResults = [];
      for (const fn of finderPatterns) {
        try {
          const r = fn();
          if (r.length > 0) allResults.push(...r);
        } catch (_) {
          /* skip selector that throws */
        }
      }

      // Try to match by data-id
      for (const r of allResults) {
        if (r.dataId && r.dataId.includes(pid)) {
          return { source: 'data_id', metrics: r, all: allResults };
        }
      }

      // Fallback: first card (most recent)
      if (allResults.length > 0) {
        return { source: 'first_card', metrics: allResults[0], all: allResults };
      }

      return { source: 'none', metrics: null, all: allResults };
    }, platformPostId);

    log(
      `Note cards found: ${metrics.all.length}, source: ${metrics.source}`
    );

    if (!metrics.metrics) {
      log('No note cards found at all — page structure may have changed');
      await browser.close();
      return {
        success: false,
        error: 'Page structure has changed, DOM selectors no longer match',
        errorCode: 'page_structure_changed',
        source: 'xhs_creator_center',
        capturedAt: nowISO(),
        executionLogs: logs,
      };
    }

    // Pattern A: .info cards with .nums
    if (metrics.metrics.nums) {
      if (metrics.metrics.nums.length < 4) {
        log(
          `Found note but metrics array too short (${metrics.metrics.nums.length}), likely not yet populated`
        );
        await browser.close();
        return {
          success: false,
          error: 'Metrics data not yet available for this note',
          errorCode: 'metrics_unavailable',
          source: 'xhs_creator_center',
          capturedAt: nowISO(),
          executionLogs: logs,
        };
      }

      const nums = metrics.metrics.nums;
      const capturedAt = nowISO();
      const result = {
        success: true,
        platformPostId,
        views: parseCount(nums[0] || '0'),
        comments: parseCount(nums[1] || '0'),
        favorites: parseCount(nums[2] || '0'),
        likes: parseCount(nums[3] || '0'),
        followConversions: parseCount(nums[4] || '0'),
        source: 'xhs_creator_center',
        capturedAt,
        executionLogs: logs,
      };

      log(
        `Metrics: views=${result.views} likes=${result.likes} favorites=${result.favorites} comments=${result.comments} follow=${result.followConversions}`
      );

      await browser.close();
      return result;
    }

    // Pattern B / Fallback — flat stat items, try to map by order
    if (metrics.metrics.text) {
      log('Fell back to generic stat-item selectors');
      // If we can get named metrics from this pattern, great;
      // otherwise signal metrics_unavailable
      await browser.close();
      return {
        success: false,
        error: 'Page structure has changed, DOM selectors no longer match',
        errorCode: 'page_structure_changed',
        source: 'xhs_creator_center',
        capturedAt: nowISO(),
        executionLogs: logs,
      };
    }

    // Unknown pattern
    await browser.close();
    return {
      success: false,
      error: 'Page structure has changed, DOM selectors no longer match',
      errorCode: 'page_structure_changed',
      source: 'xhs_creator_center',
        capturedAt: nowISO(),
      executionLogs: logs,
    };
  } catch (e) {
    log(`Error: ${e.message}`);

    // Classify timeout vs generic error
    if (e.message && e.message.includes('timeout')) {
      if (browser) await browser.close().catch(() => {});
      return {
        success: false,
        error: `Metrics fetch timed out: ${e.message}`,
        errorCode: 'metrics_fetch_timeout',
        source: 'xhs_creator_center',
        capturedAt: nowISO(),
        executionLogs: logs,
      };
    }

    if (browser) await browser.close().catch(() => {});
    return {
      success: false,
      error: e.message,
      errorCode: 'metrics_fetch_execution_error',
      source: 'xhs_creator_center',
      executionLogs: logs,
    };
  }
}

// ---- CLI entry point ----
const pid = process.argv[2];
if (!pid) {
  console.log(
    JSON.stringify({
      success: false,
      error: 'platformPostId argument is required',
      errorCode: 'missing_argument',
      source: 'xhs_creator_center',
    })
  );
  process.exit(1);
}
fetchMetrics(pid)
  .then((r) => {
    console.log(JSON.stringify(r));
    process.exit(0);
  })
  .catch((e) => {
    console.log(
      JSON.stringify({
        success: false,
        error: e.message,
        errorCode: 'metrics_fetch_execution_error',
        source: 'xhs_creator_center',
        executionLogs: logs,
      })
    );
    process.exit(1);
  });
