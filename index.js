/*
 * @Author: kiliaosi
 * @Date: 2021-04-13 11:19:16
 * @LastEditors: kiliaosi
 * @LastEditTime: 2021-04-13 13:08:51
 * @Description:
 */
'use strict'

const path = require('path');
const fs = require('fs');
const util = require('util');
const { execFile } = require('child_process');


const execFileAsync = util.promisify(execFile);

let binPath = path.resolve(__dirname, 'bin', process.arch, process.platform, "aapt");

if(process.platform === 'win32') {
  binPath += '.exe';
} else {
  fs.chmodSync(binPath, '755');
}
fs.accessSync(binPath, fs.constants.F_OK);


async function aapt(commanArgs, maxBuffer = 1024 * 1000 * 2) {
  return await execFileAsync(binPath, commanArgs, { maxBuffer });
}

function list(apkPath, args=[]) {
  return aapt(['l', ...args, apkPath]);
}

function dump(apkPath, value) {
  return aapt(['d', value, apkPath]);
}

function packageCmd(filePath, command) {
  return aapt(['p', command, filePath]);
}

function remove(filePath, files) {
  if (!Array.isArray(files)) {
    throw new Error('args files must be Array!');
  }
  return aapt(['r', filePath, ...files]);
}

function add(filePath, files) {
  if (!Array.isArray(files)) {
    throw new Error('args files must be Array!');
  }
  return aapt(['a', filePath, ...files]);
}

function crunch(resource, outputFolder) {
  if (!Array.isArray(resource)) {
    throw new Error('args files must be Array!');
  }
  return aapt(['c', '-S', ...resource, '-C', outputFolder]);
}

function singleCrunch(inputFile, outputfile) {
  return aapt(['s', '-i', inputFile, '-o', outputFile]);
}

async function getApkInfo(apkPath) {
  if (!fs.existsSync(apkPath)) {
    throw new Error('解析APK：文件不存在，' + apkPath);
  }

  const { stdout } = await dump(apkPath, 'badging');
  const match = stdout.match(/name='([^']+)'[\s]*versionCode='(\d+)'[\s]*versionName='([^']+)/);
  const matchName = stdout.match(/application: label='([^']+)'[\s]*icon='([^']+)/);
  const info = {
    package: match[1],
    version: match[3],
    name: matchName[1],
    icon: matchName[2],
  };
  if (!info.package || !info.version) {
    throw (new Error('Invalid Apk File'));
  }

  if(!info.name) {
    console.warn('apk name get error! please use : aapt d xmltree...');
  }
  return info;
}

module.exports = {
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
