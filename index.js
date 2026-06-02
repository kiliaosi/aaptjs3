/*
 * aaptjs3 — Node.js wrapper for Android Asset Packaging Tool
 *
 * v2.0.0 bundles aapt2 (v2.20-15009934 / 9.2.1).
 * Users can configure a custom aapt path — version is auto-detected
 * and the correct strategy (aapt1 or aapt2) is activated.
 */
'use strict'

const path = require('path');
const fs = require('fs');
const util = require('util');
const { execFile } = require('child_process');

const { createAapt1 } = require('./lib/aapt1');
const { createAapt2 } = require('./lib/aapt2');

const execFileAsync = util.promisify(execFile);

// ── Binary resolution ──

const ARCH = process.arch;
const PLAT = process.platform;
const BIN_DIR = path.resolve(__dirname, 'bin', ARCH, PLAT);

function getBinName(name) {
  return PLAT === 'win32' ? name + '.exe' : name;
}

const AAPT2_PATH = path.resolve(BIN_DIR, getBinName('aapt2'));

// Ensure bundled binary exists and is executable
try {
  if (PLAT !== 'win32') fs.chmodSync(AAPT2_PATH, '755');
  fs.accessSync(AAPT2_PATH, fs.constants.F_OK);
} catch (e) {
  // Bundled binary not available — user must call configure()
}

// ── Version detection ──

const VERSION = Object.freeze({ UNKNOWN: 0, AAPT1: 1, AAPT2: 2 });

async function detectVersion(binPath) {
  // aapt2: "Android Asset Packaging Tool (aapt) 2.20-..."
  try {
    const { stdout } = await execFileAsync(binPath, ['version'], {
      maxBuffer: 4096, timeout: 5000,
    });
    if (stdout.includes('(aapt)')) return VERSION.AAPT2;
  } catch { /* fall through */ }
  // aapt1: "Android Asset Packaging Tool, v0.2-..."
  try {
    const { stdout } = await execFileAsync(binPath, ['v'], {
      maxBuffer: 4096, timeout: 5000,
    });
    if (stdout.includes('Asset')) return VERSION.AAPT1;
  } catch { /* fall through */ }
  return VERSION.UNKNOWN;
}

// ── State ──

let currentBinPath = AAPT2_PATH;
let currentVersion = VERSION.AAPT2;

// Default strategy: built-in aapt2
let strategy = createAapt2(AAPT2_PATH);

// ── configure ──

async function configure(opts = {}) {
  if (!opts.binPath) return;

  let valid = false;
  try { fs.accessSync(opts.binPath, fs.constants.F_OK); valid = true; } catch { /**/ }

  if (!valid) {
    console.warn(
      `[aaptjs3] Invalid aapt path: ${opts.binPath}, falling back to built-in aapt2`
    );
    strategy = createAapt2(AAPT2_PATH);
    currentBinPath = AAPT2_PATH;
    currentVersion = VERSION.AAPT2;
    return;
  }

  const version = await detectVersion(opts.binPath);

  if (version === VERSION.UNKNOWN) {
    console.warn(
      `[aaptjs3] Could not detect aapt version at ${opts.binPath}, falling back to built-in aapt2`
    );
    strategy = createAapt2(AAPT2_PATH);
    currentBinPath = AAPT2_PATH;
    currentVersion = VERSION.AAPT2;
    return;
  }

  currentBinPath = opts.binPath;
  currentVersion = version;
  strategy = version === VERSION.AAPT1
    ? createAapt1(opts.binPath)
    : createAapt2(opts.binPath);
}

function getBinPath() {
  return currentBinPath;
}

// ── Delegated API ──
// Each call is forwarded to the active strategy

function aapt(commandArgs, maxBuffer) {
  return strategy.aapt(commandArgs, maxBuffer);
}

function list(apkPath, args) {
  return strategy.list(apkPath, args);
}

function dump(apkPath, value, extraArgs) {
  return strategy.dump(apkPath, value, extraArgs);
}

function packageCmd(filePath, command) {
  return strategy.packageCmd(filePath, command);
}

function remove(filePath, files) {
  return strategy.remove(filePath, files);
}

function add(filePath, files) {
  return strategy.add(filePath, files);
}

function crunch(resource, outputFolder) {
  return strategy.crunch(resource, outputFolder);
}

function singleCrunch(inputFile, outputFile) {
  return strategy.singleCrunch(inputFile, outputFile);
}

function getApkInfo(apkPath) {
  return strategy.getApkInfo(apkPath);
}

// ── Exports ──

module.exports = {
  configure,
  getBinPath,
  VERSION,
  aapt,
  list,
  dump,
  packageCmd,
  remove,
  add,
  crunch,
  singleCrunch,
  getApkInfo,
};
