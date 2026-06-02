/*
 * aaptjs3 test suite — uses Node.js built-in test runner (node:test)
 * Run: node --test test/test.js
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const aapt = require('../index.js');

// Test APK — should be placed in test/ directory
const TEST_APK = path.resolve(__dirname, 'test.apk');

// ── Helpers ──

let hasApk = false;
try {
  require('fs').accessSync(TEST_APK, require('fs').constants.F_OK);
  hasApk = true;
} catch {
  // Test APK not available
}

const needsApk = hasApk ? describe : describe.skip;

// ── Suite ──

describe('aaptjs3', () => {

  // ── getBinPath ──

  describe('getBinPath()', () => {
    it('should return a string ending with aapt2', () => {
      const p = aapt.getBinPath();
      assert.ok(typeof p === 'string');
      assert.ok(p.includes('aapt2'), `Expected to include aapt2, got: ${p}`);
    });
  });

  // ── aapt (low-level) ──

  needsApk('aapt() low-level exec', () => {
    it('should execute aapt and return stdout/stderr', async () => {
      const r = await aapt.aapt(['dump', 'badging', TEST_APK]);
      assert.ok(r.stdout.includes('package:'), 'stdout should contain package info');
      assert.strictEqual(typeof r.stderr, 'string');
    });
  });

  // ── dump ──

  needsApk('dump()', () => {

    it('badging — should return package info', async () => {
      const r = await aapt.dump(TEST_APK, 'badging');
      assert.ok(r.stdout.includes("name='io.appium.android.apis'"));
    });

    it('packagename — should return just the package name', async () => {
      const r = await aapt.dump(TEST_APK, 'packagename');
      assert.ok(r.stdout.includes('io.appium.android.apis'));
    });

    it('permissions — should list permissions', async () => {
      const r = await aapt.dump(TEST_APK, 'permissions');
      assert.ok(r.stdout.includes('android.permission'));
    });

    it('strings — should return string pool', async () => {
      const r = await aapt.dump(TEST_APK, 'strings');
      assert.ok(r.stdout.length > 100, 'should have string content');
    });

    it('resources — should return resource table', async () => {
      const r = await aapt.dump(TEST_APK, 'resources');
      assert.ok(r.stdout.length > 100, 'should have resource content');
    });

    it('configurations — should list configs', async () => {
      const r = await aapt.dump(TEST_APK, 'configurations');
      assert.ok(r.stdout.length > 0);
    });

    it('xmltree with --file flag', async () => {
      const r = await aapt.dump(TEST_APK, 'xmltree', ['--file', 'AndroidManifest.xml']);
      assert.ok(r.stdout.includes('manifest'), 'should include manifest element');
    });

    it('xmlstrings with --file flag', async () => {
      const r = await aapt.dump(TEST_APK, 'xmlstrings', ['--file', 'AndroidManifest.xml']);
      assert.ok(r.stdout.length > 0);
    });

    it('styleparents — requires --style flag', async () => {
      // styleparents needs --style argument; without it aapt2 exits with error
      try {
        await aapt.dump(TEST_APK, 'styleparents');
        assert.fail('should have thrown');
      } catch (err) {
        assert.ok(err.message.includes('--style'), 'should mention missing --style flag');
      }
    });
  });

  // ── list ──

  needsApk('list()', () => {
    it('should list APK contents using ZIP reader', async () => {
      const r = await aapt.list(TEST_APK);
      assert.ok(r.stdout.includes('AndroidManifest.xml'), 'should contain AndroidManifest.xml');
      assert.ok(r.stdout.includes('.apk') || r.stdout.includes('.dex') || r.stdout.includes('res/'),
        'should contain APK entries');
      assert.strictEqual(r.stderr, '');
    });
  });

  describe('list() with non-existent file', () => {
    it('should reject with error', async () => {
      await assert.rejects(
        () => aapt.list('/tmp/nonexistent_apk_file.apk'),
        /not found|ENOENT/i
      );
    });
  });

  // ── getApkInfo ──

  needsApk('getApkInfo()', () => {
    it('should extract package info', async () => {
      const info = await aapt.getApkInfo(TEST_APK);
      assert.strictEqual(info.package, 'io.appium.android.apis');
      assert.strictEqual(info.version, '3.1.0');
      assert.ok(info.name.length > 0, 'name should not be empty');
    });

    it('should reject for non-existent file', async () => {
      await assert.rejects(
        () => aapt.getApkInfo('/tmp/nope.apk'),
        /not found/i
      );
    });
  });

  // ── configure ──

  needsApk('configure()', () => {
    it('should fall back to built-in aapt2 for invalid path', async () => {
      await aapt.configure({ binPath: '/nonexistent/aapt_binary' });
      const r = await aapt.dump(TEST_APK, 'badging');
      assert.ok(r.stdout.includes('package:'), 'should still work after fallback');
      assert.ok(aapt.getBinPath().includes('aapt2'), 'should use built-in aapt2');
    });

    it('should accept a valid aapt2 binary path', async () => {
      const builtin = aapt.getBinPath();
      // Reset to built-in aapt2 and verify it works
      await aapt.configure({ binPath: builtin });
      const r = await aapt.dump(TEST_APK, 'badging');
      assert.ok(r.stdout.includes('package:'));
    });
  });

  // ── Deprecated APIs ──

  describe('deprecated APIs (aapt2 mode)', () => {
    const deprecatedFns = [
      { name: 'packageCmd', fn: () => aapt.packageCmd('/tmp/t.apk', '--v') },
      { name: 'remove',     fn: () => aapt.remove('/tmp/t.apk', 'test') },
      { name: 'add',        fn: () => aapt.add('/tmp/t.apk', 'test') },
      { name: 'crunch',     fn: () => aapt.crunch('/tmp/res', '/tmp/out') },
      { name: 'singleCrunch', fn: () => aapt.singleCrunch('/tmp/a.png', '/tmp/b.png') },
    ];

    for (const { name, fn } of deprecatedFns) {
      it(`${name}() should throw`, () => {
        assert.throws(fn, /removed in aapt2/i, `${name} should mention aapt2`);
      });
    }
  });
});
