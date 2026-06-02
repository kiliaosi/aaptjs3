/*
 * @Description: aaptjs3 - Node.js wrapper for Android Asset Packaging Tool
 *
 * Supports both aapt1 and aapt2 with automatic version detection.
 * Bundled aapt1: ~v0.2 (Android SDK Build Tools)
 * Bundled aapt2: v2.20-15009934 (9.2.1)
 */
'use strict'

const path = require('path');
const fs = require('fs');
const util = require('util');
const { execFile } = require('child_process');

const execFileAsync = util.promisify(execFile);

// --- Binaries ---

const ARCH = process.arch;
const PLAT = process.platform;
const BIN_DIR = path.resolve(__dirname, 'bin', ARCH, PLAT);

function getBinName(name) {
  return PLAT === 'win32' ? name + '.exe' : name;
}

const AAPT2_PATH = path.resolve(BIN_DIR, getBinName('aapt2'));

// Ensure bundled binary has correct permissions
try {
  if (PLAT !== 'win32') {
    fs.chmodSync(AAPT2_PATH, '755');
  }
  fs.accessSync(AAPT2_PATH, fs.constants.F_OK);
} catch (e) {
  // Bundled binary not found — user must configure a custom path
}

// --- Version detection ---

const VERSION = Object.freeze({ UNKNOWN: 0, AAPT1: 1, AAPT2: 2 });

async function detectVersion(binPath) {
  // aapt2 supports "version" subcommand
  try {
    const { stdout } = await execFileAsync(binPath, ['version'], {
      maxBuffer: 4096,
      timeout: 5000,
    });
    if (stdout.includes('(aapt)')) return VERSION.AAPT2;
    if (stdout.includes('Asset')) return VERSION.AAPT1;
  } catch {
    // aapt1 only supports "v", not "version"
  }
  // Try aapt1-style version
  try {
    const { stdout } = await execFileAsync(binPath, ['v'], {
      maxBuffer: 4096,
      timeout: 5000,
    });
    if (stdout.includes('Asset')) return VERSION.AAPT1;
  } catch {
    // Can't detect
  }
  return VERSION.UNKNOWN;
}

// --- State ---

let currentBinPath = AAPT2_PATH;
let currentVersion = VERSION.AAPT2;

// --- Configure ---

/**
 * Configure a custom aapt binary path.
 * Detects version automatically and routes APIs accordingly.
 *
 * @example
 *   const aaptjs = require('aaptjs3');
 *   await aaptjs.configure({ binPath: '/usr/local/bin/aapt' });
 */
async function configure(opts = {}) {
  if (!opts.binPath) return;

  // Verify path exists and is executable
  let valid = false;
  try {
    fs.accessSync(opts.binPath, fs.constants.F_OK);
    valid = true;
  } catch {
    valid = false;
  }

  if (!valid) {
    console.warn(
      `[aaptjs3] Invalid aapt path: ${opts.binPath}, falling back to built-in aapt2`
    );
    currentBinPath = AAPT2_PATH;
    currentVersion = VERSION.AAPT2;
    return;
  }

  const version = await detectVersion(opts.binPath);

  if (version === VERSION.UNKNOWN) {
    console.warn(
      `[aaptjs3] Could not detect aapt version at ${opts.binPath}, falling back to built-in aapt2`
    );
    currentBinPath = AAPT2_PATH;
    currentVersion = VERSION.AAPT2;
    return;
  }

  // All good — use user's binary
  currentBinPath = opts.binPath;
  currentVersion = version;
}

// --- ZIP reader (used by aapt2 list) ---

function readZipEntries(apkPath) {
  const buf = fs.readFileSync(apkPath);
  if (buf.length < 22) {
    throw new Error('File too small, not a valid APK/ZIP file');
  }

  // Find EOCD signature
  const maxComment = Math.min(buf.length, 65535 + 22);
  let eocdPos = -1;
  for (let i = buf.length - 22; i >= buf.length - maxComment && i >= 0; i--) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b &&
        buf[i + 2] === 0x05 && buf[i + 3] === 0x06) {
      eocdPos = i;
      break;
    }
  }
  if (eocdPos === -1) {
    throw new Error('Could not find ZIP EOCD marker, file may be corrupted');
  }

  let cdOffset = buf.readUInt32LE(eocdPos + 16);
  let totalEntries = buf.readUInt16LE(eocdPos + 10);

  // ZIP64 handling
  if (totalEntries === 0xffff) {
    const locPos = eocdPos - 20;
    if (locPos < 0) throw new Error('ZIP64 APK parse failed');
    if (buf[locPos] === 0x50 && buf[locPos + 1] === 0x4b &&
        buf[locPos + 2] === 0x06 && buf[locPos + 3] === 0x07) {
      const zip64EocdOffset = Number(buf.readBigUInt64LE(locPos + 8));
      totalEntries = Number(buf.readBigUInt64LE(zip64EocdOffset + 32));
      cdOffset = Number(buf.readBigUInt64LE(zip64EocdOffset + 48));
    } else {
      throw new Error('ZIP64 APK format not supported');
    }
  }

  const entries = [];
  let pos = cdOffset;
  for (let i = 0; i < totalEntries && pos + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) break;
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    entries.push(buf.toString('utf8', pos + 46, pos + 46 + nameLen));
    pos = pos + 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

// --- aapt1 implementation (used when user configures a custom aapt1 binary) ---

function aapt1Exec(commandArgs, maxBuffer = 1024 * 1000 * 2) {
  return execFileAsync(currentBinPath, commandArgs, { maxBuffer });
}

const aapt1 = {
  aapt: aapt1Exec,

  list(apkPath, args = []) {
    return aapt1Exec(['l', ...args, apkPath]);
  },

  dump(apkPath, value) {
    return aapt1Exec(['d', value, apkPath]);
  },

  packageCmd(filePath, command) {
    return aapt1Exec(['p', command, filePath]);
  },

  remove(filePath, files) {
    if (!Array.isArray(files)) files = [files];
    return aapt1Exec(['r', filePath, ...files]);
  },

  add(filePath, files) {
    if (!Array.isArray(files)) files = [files];
    return aapt1Exec(['a', filePath, ...files]);
  },

  crunch(resource, outputFolder) {
    if (!Array.isArray(resource)) resource = [resource];
    return aapt1Exec(['c', '-S', ...resource, '-C', outputFolder]);
  },

  singleCrunch(inputFile, outputFile) {
    return aapt1Exec(['s', '-i', inputFile, '-o', outputFile]);
  },

  async getApkInfo(apkPath) {
    if (!fs.existsSync(apkPath)) {
      throw new Error('APK file not found: ' + apkPath);
    }
    const { stdout } = await this.dump(apkPath, 'badging');
    const match = stdout.match(/name='([^']+)'[\s]*versionCode='(\d+)'[\s]*versionName='([^']+)/);
    const matchName = stdout.match(/application: label='([^']+)'[\s]*icon='([^']+)/);
    if (!match) throw new Error('Could not parse package name and version from APK');
    return {
      package: match[1],
      version: match[3],
      name: matchName ? matchName[1] : '',
      icon: matchName ? matchName[2] : '',
    };
  },
};

// --- aapt2 implementation ---

const aapt2 = {
  binPath: AAPT2_PATH,

  async aapt(commandArgs, maxBuffer = 1024 * 1000 * 2) {
    return execFileAsync(AAPT2_PATH, commandArgs, { maxBuffer });
  },

  dump(apkPath, value, extraArgs = []) {
    return this.aapt(['dump', value, ...extraArgs, apkPath]);
  },

  list(apkPath) {
    if (!fs.existsSync(apkPath)) {
      return Promise.reject(new Error('File not found: ' + apkPath));
    }
    try {
      const entries = readZipEntries(apkPath);
      return Promise.resolve({ stdout: entries.join('\n'), stderr: '' });
    } catch (err) {
      return Promise.reject(err);
    }
  },

  packageCmd() {
    throw new Error(
      'packageCmd has been removed in aapt2. Use aapt2 compile + link instead.\n' +
      'See: https://developer.android.com/tools/aapt2'
    );
  },

  remove() {
    throw new Error(
      'remove has been removed in aapt2. Use aapt2 optimize or zip tools instead.'
    );
  },

  add() {
    throw new Error(
      'add has been removed in aapt2. Use aapt2 compile + link or zip tools instead.'
    );
  },

  crunch() {
    throw new Error(
      'crunch has been removed in aapt2. Use aapt2 compile instead.'
    );
  },

  singleCrunch() {
    throw new Error(
      'singleCrunch has been removed in aapt2. Use aapt2 compile instead.'
    );
  },

  async getApkInfo(apkPath) {
    if (!fs.existsSync(apkPath)) {
      throw new Error('APK file not found: ' + apkPath);
    }
    const { stdout } = await this.dump(apkPath, 'badging');
    const match = stdout.match(/name='([^']+)'[\s]*versionCode='(\d+)'[\s]*versionName='([^']+)/);
    const matchName = stdout.match(/application: label='([^']+)'[\s]*icon='([^']+)/);
    if (!match) throw new Error('Could not parse package name and version from APK');
    return {
      package: match[1],
      version: match[3],
      name: matchName ? matchName[1] : '',
      icon: matchName ? matchName[2] : '',
    };
  },
};

// --- Helpers ---

function getImpl() {
  return currentVersion === VERSION.AAPT1 ? aapt1 : aapt2;
}

function getBinPath() {
  return currentBinPath;
}

// For the `aapt` low-level function: use the CURRENT binary (could be user's custom)
async function aapt(commandArgs, maxBuffer = 1024 * 1000 * 2) {
  return execFileAsync(currentBinPath, commandArgs, { maxBuffer });
}

// Other functions dispatch to the appropriate implementation
function list(apkPath, args) {
  return getImpl().list(apkPath, args);
}

function dump(apkPath, value, extraArgs) {
  return getImpl().dump(apkPath, value, extraArgs);
}

function packageCmd(filePath, command) {
  return getImpl().packageCmd(filePath, command);
}

function remove(filePath, files) {
  return getImpl().remove(filePath, files);
}

function add(filePath, files) {
  return getImpl().add(filePath, files);
}

function crunch(resource, outputFolder) {
  return getImpl().crunch(resource, outputFolder);
}

function singleCrunch(inputFile, outputFile) {
  return getImpl().singleCrunch(inputFile, outputFile);
}

function getApkInfo(apkPath) {
  return getImpl().getApkInfo(apkPath);
}

// --- Exports ---

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
