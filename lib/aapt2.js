/*
 * aapt2 strategy — implements the aapt2 command set.
 *
 * aapt2 renamed or removed several aapt1 subcommands:
 *   "l" (list) → removed, use ZIP reader
 *   "p" (package) → replaced by compile + link workflow
 *   "r" (remove) → removed
 *   "a" (add) → removed
 *   "c" (crunch) → replaced by compile
 *   "s" (singleCrunch) → replaced by compile
 *
 * dump subcommands mostly the same, but xmltree/xmlstrings need --file flag.
 */
'use strict'

const fs = require('fs');
const util = require('util');
const { execFile } = require('child_process');
const { readZipEntries } = require('./zip-reader');

const execFileAsync = util.promisify(execFile);

function createAapt2(binPath) {

  function exec(args, maxBuffer = 1024 * 1000 * 2) {
    return execFileAsync(binPath, args, { maxBuffer });
  }

  // ── public API ──

  function aapt(commandArgs, maxBuffer) {
    return exec(commandArgs, maxBuffer);
  }

  function dump(apkPath, value, extraArgs = []) {
    return exec(['dump', value, ...extraArgs, apkPath]);
  }

  function list(apkPath) {
    if (!fs.existsSync(apkPath)) {
      return Promise.reject(new Error('File not found: ' + apkPath));
    }
    try {
      const entries = readZipEntries(apkPath);
      return Promise.resolve({ stdout: entries.join('\n'), stderr: '' });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function packageCmd() {
    throw new Error(
      'packageCmd has been removed in aapt2. Use aapt2 compile + link instead.\n' +
      'See: https://developer.android.com/tools/aapt2'
    );
  }

  function remove() {
    throw new Error(
      'remove has been removed in aapt2. Use aapt2 optimize or zip tools instead.'
    );
  }

  function add() {
    throw new Error(
      'add has been removed in aapt2. Use aapt2 compile + link or zip tools instead.'
    );
  }

  function crunch() {
    throw new Error(
      'crunch has been removed in aapt2. Use aapt2 compile instead.'
    );
  }

  function singleCrunch() {
    throw new Error(
      'singleCrunch has been removed in aapt2. Use aapt2 compile instead.'
    );
  }

  async function getApkInfo(apkPath) {
    if (!fs.existsSync(apkPath)) {
      throw new Error('APK file not found: ' + apkPath);
    }
    const { stdout } = await dump(apkPath, 'badging');
    const match = stdout.match(/name='([^']+)'[\s]*versionCode='(\d+)'[\s]*versionName='([^']+)/);
    const matchName = stdout.match(/application: label='([^']+)'[\s]*icon='([^']+)/);
    if (!match) throw new Error('Could not parse package name and version from APK');
    return {
      package: match[1],
      version: match[3],
      name: matchName ? matchName[1] : '',
      icon: matchName ? matchName[2] : '',
    };
  }

  return { aapt, list, dump, packageCmd, remove, add, crunch, singleCrunch, getApkInfo };
}

module.exports = { createAapt2 };
