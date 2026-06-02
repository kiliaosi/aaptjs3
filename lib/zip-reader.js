/*
 * ZIP central directory reader — used by aapt2 list() since aapt2
 * removed the "list" subcommand. APK files are standard ZIP archives.
 */
'use strict'

const fs = require('fs');

function readZipEntries(apkPath) {
  const buf = fs.readFileSync(apkPath);
  if (buf.length < 22) {
    throw new Error('File too small, not a valid APK/ZIP file');
  }

  // Find EOCD signature (0x06054b50) near end of file
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

  // ZIP64: read extended EOCD
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
    if (buf.readUInt32LE(pos) !== 0x02014b50) break; // central directory entry signature
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    entries.push(buf.toString('utf8', pos + 46, pos + 46 + nameLen));
    pos = pos + 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

module.exports = { readZipEntries };
