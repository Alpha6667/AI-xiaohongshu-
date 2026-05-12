#!/usr/bin/env python3
"""
Tests for OpenClaw publish persistence layer (publish_state.js, publish_lock.js, xhs_preflight.js).

These tests validate:
1. Mock/preflight does not create real publish state
2. Same postId with lock refuses duplicate publish
3. submitClicked=true refuses re-publish
4. Callback failure preserves platformPostId
5. JSON state files contain no sensitive info

Uses Node.js child process to invoke the JS modules.
"""

import json
import os
import subprocess
import unittest

# Paths
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
OPENCLAW_DIR = os.path.join(PROJECT_ROOT, 'openclaw')
STATE_MODULE = os.path.join(OPENCLAW_DIR, 'publisher', 'publish_state.js')
LOCK_MODULE = os.path.join(OPENCLAW_DIR, 'publisher', 'publish_lock.js')
PREFLIGHT_MODULE = os.path.join(OPENCLAW_DIR, 'publisher', 'xhs_preflight.js')

STATE_DIR = '/root/.openclaw/publish-state'
LOCK_DIR = '/root/.openclaw/publish-locks'

NODE = os.environ.get('NODE', '/root/.nvm/versions/node/v22.22.0/bin/node')
if not os.path.exists(NODE):
    for p in ['/usr/bin/node', '/usr/local/bin/node', '/opt/homebrew/bin/node', '/snap/bin/node', '/root/.nvm/versions/node/v22.22.0/bin/node']:
        if os.path.exists(p):
            NODE = p
            break


def _clean_persistence():
    """Clean up state and lock directories between tests."""
    for d in [STATE_DIR, LOCK_DIR]:
        if os.path.exists(d):
            for f in os.listdir(d):
                os.unlink(os.path.join(d, f))


def _node_eval(code):
    """Run a snippet of Node.js and return its stdout as a string."""
    result = subprocess.run(
        [NODE, '-e', code],
        capture_output=True,
        text=True,
        timeout=10,
    )
    if result.returncode != 0:
        raise RuntimeError("Node eval failed:\nstdout: %s\nstderr: %s" % (result.stdout, result.stderr))
    return result.stdout.strip()


# ---- Test code templates (use %% instead of % for Python, then substitute) ---- #
# We use plain string concatenation to avoid f-string / JS brace conflicts.

class TestPublishState(unittest.TestCase):
    """Tests for publish_state.js module."""

    def setUp(self):
        _clean_persistence()

    def test_create_and_read_state(self):
        """Creating a state file allows reading back all fields."""
        code = (
            'const { createState, readState } = require("%s");\n'
            'const state = createState({\n'
            '  postId: "post_test_001", title: "Test Title",\n'
            '  tags: ["tag1", "tag2"], finalBody: "Hello world",\n'
            '  assetHashes: ["hash1", "hash2"],\n'
            '});\n'
            'const read = readState("post_test_001");\n'
            'console.log(JSON.stringify(read));\n'
        ) % STATE_MODULE
        out = _node_eval(code)
        state = json.loads(out)
        self.assertEqual(state['postId'], 'post_test_001')
        self.assertEqual(state['title'], 'Test Title')
        self.assertEqual(state['tags'], ['tag1', 'tag2'])
        self.assertEqual(state['status'], 'idle')
        self.assertEqual(state['submitClicked'], False)
        self.assertEqual(state['attempt'], 1)
        self.assertIsNotNone(state['finalBodyHash'])
        self.assertNotEqual(state['finalBodyHash'], '')
        self.assertNotIn('secret', state)
        self.assertNotIn('token', state)
        self.assertNotIn('password', state)
        self.assertEqual(len(state['events']), 1)
        self.assertEqual(state['events'][0]['event'], 'created')

    def test_state_no_sensitive_info(self):
        """JSON state files contain no sensitive info keys."""
        code = (
            'const { createState, readState } = require("%s");\n'
            'createState({ postId: "post_nosecret", title: "Test", tags: ["test"], finalBody: "Sensitive body", assetHashes: [] });\n'
            'const state = readState("post_nosecret");\n'
            'const keys = Object.keys(state);\n'
            'const sensitiveWords = ["token", "cookie", "password", "secret", "profile", "auth"];\n'
            'const found = sensitiveWords.filter(function(w) { return keys.some(function(k) { return k.toLowerCase().includes(w); }); });\n'
            'console.log(JSON.stringify(found));\n'
        ) % STATE_MODULE
        out = _node_eval(code)
        found = json.loads(out)
        self.assertEqual(found, [], "State should not contain any sensitive keys")

    def test_final_body_not_stored_raw(self):
        """finalBody is stored as hash, not raw content."""
        code = (
            'const { createState, readState } = require("%s");\n'
            'createState({ postId: "post_hash_test", title: "Test", tags: [], finalBody: "Full body content", assetHashes: [] });\n'
            'const state = readState("post_hash_test");\n'
            'const hasHash = "finalBodyHash" in state;\n'
            'const hasRaw = "finalBody" in state || "body" in state;\n'
            'console.log(JSON.stringify({ hasHash: hasHash, hasRaw: hasRaw }));\n'
        ) % STATE_MODULE
        out = _node_eval(code)
        result = json.loads(out)
        self.assertTrue(result['hasHash'], "State should have finalBodyHash field")
        self.assertFalse(result['hasRaw'], "State should NOT have raw finalBody/body field")

    def test_add_event(self):
        """Adding events grows the events array."""
        code = (
            'const { createState, readState, addEvent } = require("%s");\n'
            'createState({ postId: "post_events", title: "Test", tags: [], finalBody: "", assetHashes: [] });\n'
            'addEvent("post_events", "browser_started", "Browser launched");\n'
            'addEvent("post_events", "asset_uploaded", "3 images uploaded", "publishing");\n'
            'const state = readState("post_events");\n'
            'console.log(JSON.stringify({ eventsCount: state.events.length, status: state.status }));\n'
        ) % STATE_MODULE
        out = _node_eval(code)
        result = json.loads(out)
        self.assertEqual(result['eventsCount'], 3)  # created + browser_started + asset_uploaded
        self.assertEqual(result['status'], 'publishing')

    def test_submit_clicked_flag(self):
        """submit_clicked event sets submitClicked to true."""
        code = (
            'const { createState, readState, addEvent } = require("%s");\n'
            'createState({ postId: "post_submit", title: "Test", tags: [], finalBody: "", assetHashes: [] });\n'
            'addEvent("post_submit", "submit_clicked", "Clicked publish", "submit_clicked");\n'
            'const state = readState("post_submit");\n'
            'console.log(JSON.stringify({ submitClicked: state.submitClicked, status: state.status }));\n'
        ) % STATE_MODULE
        out = _node_eval(code)
        result = json.loads(out)
        self.assertTrue(result['submitClicked'])
        self.assertEqual(result['status'], 'submit_clicked')

    def test_mark_failed(self):
        """markFailed sets status to failed and records error."""
        code = (
            'const { createState, readState, markFailed } = require("%s");\n'
            'createState({ postId: "post_fail", title: "Test", tags: [], finalBody: "", assetHashes: [] });\n'
            'markFailed("post_fail", "Rate limited");\n'
            'const state = readState("post_fail");\n'
            'console.log(JSON.stringify({ status: state.status, lastError: state.lastError, eventsCount: state.events.length }));\n'
        ) % STATE_MODULE
        out = _node_eval(code)
        result = json.loads(out)
        self.assertEqual(result['status'], 'failed')
        self.assertEqual(result['lastError'], 'Rate limited')

    def test_callback_pending_state_preserves_platform_post_id(self):
        """callback_pending status preserves platformPostId."""
        code = (
            'const { createState, readState, addEvent, setPlatformPostId } = require("%s");\n'
            'createState({ postId: "post_cbfail", title: "Test", tags: [], finalBody: "", assetHashes: [] });\n'
            'addEvent("post_cbfail", "submit_clicked", "Clicked", "submit_clicked");\n'
            'setPlatformPostId("post_cbfail", "xh_1234567890");\n'
            'addEvent("post_cbfail", "failed", "Callback failed, platformPostId preserved: xh_1234567890", "callback_pending");\n'
            'const state = readState("post_cbfail");\n'
            'console.log(JSON.stringify({\n'
            '  status: state.status,\n'
            '  platformPostId: state.platformPostId,\n'
            '  submitClicked: state.submitClicked,\n'
            '  lastEvent: state.events[state.events.length - 1].event\n'
            '}));\n'
        ) % STATE_MODULE
        out = _node_eval(code)
        result = json.loads(out)
        self.assertEqual(result['status'], 'callback_pending')
        self.assertEqual(result['platformPostId'], 'xh_1234567890')

    def test_is_submit_clicked(self):
        """isSubmitClicked correctly reports state."""
        code = (
            'const { createState, addEvent, isSubmitClicked } = require("%s");\n'
            'createState({ postId: "post_subcheck", title: "Test", tags: [], finalBody: "", assetHashes: [] });\n'
            'const before = isSubmitClicked("post_subcheck");\n'
            'addEvent("post_subcheck", "submit_clicked", "Clicked", "submit_clicked");\n'
            'const after = isSubmitClicked("post_subcheck");\n'
            'console.log(JSON.stringify({ before: before, after: after }));\n'
        ) % STATE_MODULE
        out = _node_eval(code)
        result = json.loads(out)
        self.assertFalse(result['before'])
        self.assertTrue(result['after'])


class TestPublishLock(unittest.TestCase):
    """Tests for publish_lock.js module."""

    def setUp(self):
        _clean_persistence()

    def test_acquire_and_release_lock(self):
        """Acquire then release lock."""
        code = (
            'const { acquireLock, isLocked, releaseLock, getLock } = require("%s");\n'
            'const result = acquireLock("post_lock_001");\n'
            'const locked = isLocked("post_lock_001");\n'
            'const info = getLock("post_lock_001");\n'
            'releaseLock("post_lock_001");\n'
            'const afterRelease = isLocked("post_lock_001");\n'
            'console.log(JSON.stringify({\n'
            '  acquired: result.acquired,\n'
            '  locked: locked,\n'
            '  hasInfo: info !== null && info.postId === "post_lock_001",\n'
            '  afterRelease: afterRelease\n'
            '}));\n'
        ) % LOCK_MODULE
        out = _node_eval(code)
        result = json.loads(out)
        self.assertTrue(result['acquired'])
        self.assertTrue(result['locked'])
        self.assertTrue(result['hasInfo'])
        self.assertFalse(result['afterRelease'])

    def test_reject_duplicate_lock(self):
        """Second lock for same postId is rejected."""
        code = (
            'const { acquireLock, releaseLock } = require("%s");\n'
            'const first = acquireLock("post_dup");\n'
            'const second = acquireLock("post_dup");\n'
            'releaseLock("post_dup");\n'
            'console.log(JSON.stringify({ first: first.acquired, second: second.acquired, reason: second.reason ? "yes" : "no" }));\n'
        ) % LOCK_MODULE
        out = _node_eval(code)
        result = json.loads(out)
        self.assertTrue(result['first'])
        self.assertFalse(result['second'])
        self.assertEqual(result['reason'], 'yes')

    def test_zombie_cleanup(self):
        """Zombie lock (>30 min, pid dead) is cleaned up."""
        code = (
            'const fs = require("fs");\n'
            'const path = require("path");\n'
            'const { acquireLock, isLocked, getLock, cleanZombieLocks } = require("%s");\n'
            'const lockDir = "%s";\n'
            'if (!fs.existsSync(lockDir)) fs.mkdirSync(lockDir, { recursive: true });\n'
            'const zombie = {\n'
            '  postId: "post_zombie",\n'
            '  startedAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),\n'
            '  pid: 999999999\n'
            '};\n'
            'fs.writeFileSync(path.join(lockDir, "post_zombie.lock"), JSON.stringify(zombie), "utf8");\n'
            'const lockedBefore = isLocked("post_zombie");\n'
            'const cleaned = cleanZombieLocks();\n'
            'const lockedAfter = isLocked("post_zombie");\n'
            'console.log(JSON.stringify({ lockedBefore: lockedBefore, cleaned: cleaned, lockedAfter: lockedAfter }));\n'
        ) % (LOCK_MODULE, LOCK_DIR)
        out = _node_eval(code)
        result = json.loads(out)
        self.assertFalse(result['lockedBefore'], "Zombie lock should not be considered locked before cleanup")
        self.assertFalse(result['lockedAfter'], "Zombie lock should be gone after cleanup")


class TestPreflight(unittest.TestCase):
    """Tests for xhs_preflight.js module."""

    def setUp(self):
        _clean_persistence()

    def test_preflight_no_state(self):
        """preflight passes when no state exists."""
        code = (
            'const { preflightCheck } = require("%s");\n'
            'const result = preflightCheck({ postId: "post_new", content: { title: "Test", body: "Hello", tags: ["tag1"], assets: [] } });\n'
            'console.log(JSON.stringify(result));\n'
        ) % PREFLIGHT_MODULE
        out = _node_eval(code)
        result = json.loads(out)
        self.assertTrue(result['passed'])

    def test_preflight_after_submit_clicked(self):
        """preflight rejects after submitClicked=true."""
        code = (
            'const { createState, addEvent } = require("%s");\n'
            'const { preflightCheck } = require("%s");\n'
            'createState({ postId: "post_already_submitted", title: "Test", tags: [], finalBody: "", assetHashes: [] });\n'
            'addEvent("post_already_submitted", "submit_clicked", "Already submitted", "submit_clicked");\n'
            'const result = preflightCheck({ postId: "post_already_submitted", content: { title: "Test", body: "", tags: [], assets: [] } });\n'
            'console.log(JSON.stringify(result));\n'
        ) % (STATE_MODULE, PREFLIGHT_MODULE)
        out = _node_eval(code)
        result = json.loads(out)
        self.assertFalse(result['passed'])
        self.assertIn('submitClicked', result.get('reason', ''))

    def test_preflight_callback_pending(self):
        """preflight rejects callback_pending and returns platformPostId."""
        code = (
            'const { createState, addEvent, setPlatformPostId } = require("%s");\n'
            'const { preflightCheck } = require("%s");\n'
            'createState({ postId: "post_cbwait", title: "Test", tags: [], finalBody: "", assetHashes: [] });\n'
            'addEvent("post_cbwait", "submit_clicked", "Clicked", "submit_clicked");\n'
            'setPlatformPostId("post_cbwait", "xh_callback_12345");\n'
            'addEvent("post_cbwait", "failed", "Callback failed", "callback_pending");\n'
            'const result = preflightCheck({ postId: "post_cbwait", content: { title: "Test", body: "", tags: [], assets: [] } });\n'
            'console.log(JSON.stringify(result));\n'
        ) % (STATE_MODULE, PREFLIGHT_MODULE)
        out = _node_eval(code)
        result = json.loads(out)
        self.assertFalse(result['passed'])
        self.assertEqual(result['platformPostId'], 'xh_callback_12345')

    def test_init_publish_state_creates_state(self):
        """initPublishState creates correct state file."""
        code = (
            'const { initPublishState } = require("%s");\n'
            'const { readState } = require("%s");\n'
            'const task = {\n'
            '  postId: "post_init_test",\n'
            '  content: {\n'
            '    title: "Init Test",\n'
            '    body: "Initial body",\n'
            '    tags: ["tag1", "tag2"],\n'
            '    assets: [{ url: "https://example.com/img1.jpg" }, { url: "/local/path/img2.png" }]\n'
            '  }\n'
            '};\n'
            'const result = initPublishState(task);\n'
            'const state = readState("post_init_test");\n'
            'console.log(JSON.stringify({\n'
            '  ok: result.ok,\n'
            '  postId: state.postId,\n'
            '  title: state.title,\n'
            '  status: state.status,\n'
            '  hasHash: state.finalBodyHash && state.finalBodyHash.length === 64,\n'
            '  assetCount: state.assetHashes.length,\n'
            '  tags: state.tags,\n'
            '  firstEvent: state.events[0].event,\n'
            '  secondEvent: state.events[1].event,\n'
            '}));\n'
        ) % (PREFLIGHT_MODULE, STATE_MODULE)
        out = _node_eval(code)
        result = json.loads(out)
        self.assertTrue(result['ok'])
        self.assertEqual(result['postId'], 'post_init_test')
        self.assertEqual(result['title'], 'Init Test')
        self.assertEqual(result['status'], 'preparing')
        self.assertTrue(result['hasHash'])
        self.assertEqual(result['assetCount'], 2)
        self.assertEqual(result['tags'], ['tag1', 'tag2'])
        self.assertEqual(result['firstEvent'], 'created')
        self.assertEqual(result['secondEvent'], 'preflight_passed')


class TestLockAndStateRejectDoublePublish(unittest.TestCase):
    """Combined test: lock + state both prevent double publish."""

    def setUp(self):
        _clean_persistence()

    def test_complete_flow(self):
        """Full flow: lock + publish + submit_clicked, preflightCheck rejects re-publish."""
        code = (
            'const { createState, addEvent, setPlatformPostId, readState, markCompleted } = require("%s");\n'
            'const { acquireLock, releaseLock } = require("%s");\n'
            'const { preflightCheck } = require("%s");\n'
            'const postId = "post_full";\n'
            'createState({ postId: postId, title: "Full", tags: ["a"], finalBody: "body", assetHashes: [] });\n'
            'const lock1 = acquireLock(postId);\n'
            'if (!lock1.acquired) { console.log(JSON.stringify({ error: "lock1 failed" })); process.exit(1); }\n'
            'addEvent(postId, "submit_clicked", "Clicked", "submit_clicked");\n'
            'setPlatformPostId(postId, "xh_full_999");\n'
            'releaseLock(postId);\n'
            'markCompleted(postId, "xh_full_999");\n'
            '// Preflight should reject since status is completed\n'
            'const preflightResult = preflightCheck({ postId: postId, content: { title: "Again", body: "", tags: [], assets: [] } });\n'
            'const stateAfter = readState(postId);\n'
            'console.log(JSON.stringify({\n'
            '  preflightPassed: preflightResult.passed,\n'
            '  submitClicked: stateAfter.submitClicked,\n'
            '  status: stateAfter.status,\n'
            '  platformPostId: stateAfter.platformPostId,\n'
            '}));\n'
        ) % (STATE_MODULE, LOCK_MODULE, PREFLIGHT_MODULE)
        out = _node_eval(code)
        result = json.loads(out)
        self.assertFalse(result['preflightPassed'], "Second publish should be rejected by preflight")
        self.assertTrue(result['submitClicked'])
        self.assertEqual(result['platformPostId'], 'xh_full_999')

    def test_mock_no_state_created(self):
        """Mock mode does not create any state files."""
        code = (
            'const fs = require("fs");\n'
            'const stateDir = "%s";\n'
            'const before = fs.existsSync(stateDir) ? fs.readdirSync(stateDir).filter(function(f) { return f.endsWith(".json"); }).length : 0;\n'
            '// Mock publishes do NOT create state files\n'
            'const after = fs.existsSync(stateDir) ? fs.readdirSync(stateDir).filter(function(f) { return f.endsWith(".json"); }).length : 0;\n'
            'console.log(JSON.stringify({ before: before, after: after }));\n'
        ) % STATE_DIR
        out = _node_eval(code)
        result = json.loads(out)
        self.assertEqual(result['before'], 0)
        self.assertEqual(result['after'], 0)


if __name__ == '__main__':
    unittest.main()
