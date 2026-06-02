# aaptjs3

Node.js wrapper for Android Asset Packaging Tool (aapt). Bundles prebuilt aapt binaries — no Android SDK installation required.

> **Note:** This package ships **aapt1** which was deprecated by Google in 2019. It works for most APK inspection tasks but may fail on newer APKs (targetSdk 34+). An aapt2 upgrade is planned.

## Platform Support

| Platform | Architecture | Status |
|----------|-------------|--------|
| Windows  | x64         | ✅     |
| macOS    | x64         | ✅     |
| Linux    | x64         | ✅     |
| Linux    | ARM         | ✅     |

## Install

```bash
npm install aaptjs3 --save
```

## Example

```js
const aapt = require('aaptjs3');

// Dump APK metadata
aapt.dump('/path/to/app.apk', 'badging')
  .then(data => console.log(data.stdout))
  .catch(err => console.error(err));

// Get structured APK info
aapt.getApkInfo('/path/to/app.apk')
  .then(info => console.log(info))
  .catch(err => console.error(err));
```

## API

```typescript
interface ExecResult {
  stdout: string;
  stderr: string;
}

interface PackageInfo {
  package: string;
  version: string;
  name: string;
  icon: string;
}
```

### `aapt(commandArgs: string[], maxBuffer?: number): Promise<ExecResult>`

Low-level API. Execute aapt with arbitrary arguments.

```js
aapt(['d', 'badging', 'app.apk']).then(r => console.log(r.stdout));
```

### `dump(apkPath: string, value: string): Promise<ExecResult>`

Dump APK information. Common values: `badging`, `xmltree`, `strings`, `resources`, `permissions`, `configurations`.

```js
aapt.dump('app.apk', 'badging');
aapt.dump('app.apk', 'xmltree');
```

### `list(apkPath: string, args?: string[]): Promise<ExecResult>`

List APK contents.

```js
aapt.list('app.apk', ['-a']);  // verbose listing
aapt.list('app.apk');          // simple listing
```

### `packageCmd(filePath: string, command: string): Promise<ExecResult>`

Package command. See aapt `p` subcommand.

### `remove(filePath: string, files: string | string[]): Promise<ExecResult>`

Remove files from APK/ZIP.

```js
aapt.remove('app.apk', 'res/icon.png');
aapt.remove('app.apk', ['res/icon.png', 'res/logo.png']);
```

### `add(filePath: string, files: string | string[]): Promise<ExecResult>`

Add files to APK/ZIP.

```js
aapt.add('app.apk', 'new-file.png');
aapt.add('app.apk', ['new-file.png', 'lib/foo.so']);
```

### `crunch(resource: string | string[], outputFolder: string): Promise<ExecResult>`

Crunch PNG resources.

```js
aapt.crunch('res/drawable', 'out/res');
aapt.crunch(['res/drawable', 'res/mipmap'], 'out/res');
```

### `singleCrunch(inputFile: string, outputFile: string): Promise<ExecResult>`

Crunch a single PNG file.

```js
aapt.singleCrunch('input.png', 'output.png');
```

### `getApkInfo(apkPath: string): Promise<PackageInfo>`

Extract package name, version, app label, and icon from an APK.

```js
const info = await aapt.getApkInfo('app.apk');
// { package: 'com.example.app', version: '1.0.0', name: 'My App', icon: 'res/mipmap/ic_launcher.png' }
```

## License

MIT
