/*
 * aapt1 strategy — implements the full aapt1 command set.
 *
 * All aapt1 subcommands (l, d, p, r, a, c, s) work as expected.
 */
'use strict'

const fs = require('fs');
const util = require('util');
const { execFile } = require('child_process');

const execFileAsync = util.promisify(execFile);

function createAapt1(binPath) {

  function exec(args, maxBuffer = 1024 * 1000 * 2) {
    return execFileAsync(binPath, args, { maxBuffer });
  }

  // ── public API ──

  function aapt(commandArgs, maxBuffer) {
    return exec(commandArgs, maxBuffer);
  }

  function list(apkPath, args = []) {
    return exec(['l', ...args, apkPath]);
  }

  function dump(apkPath, value) {
    return exec(['d', value, apkPath]);
  }

  function packageCmd(filePath, command) {
    return exec(['p', command, filePath]);
  }

  function remove(filePath, files) {
    if (!Array.isArray(files)) files = [files];
    return exec(['r', filePath, ...files]);
  }

  function add(filePath, files) {
    if (!Array.isArray(files)) files = [files];
    return exec(['a', filePath, ...files]);
  }

  function crunch(resource, outputFolder) {
    if (!Array.isArray(resource)) resource = [resource];
    return exec(['c', '-S', ...resource, '-C', outputFolder]);
  }

  function singleCrunch(inputFile, outputFile) {
    return exec(['s', '-i', inputFile, '-o', outputFile]);
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

module.exports = { createAapt1 };
