# aaptjs3

Node.js wrapper for **[aapt2](https://developer.android.com/tools/aapt2)** (Android Asset Packaging Tool 2). Bundles prebuilt aapt2 binaries — no Android SDK installation required.

> **v2.0.0** upgrades from aapt1 to aapt2. If you need aapt1, use `aaptjs3@^1.0.9` or the `legacy-aapt1` branch.

## Platform Support

| Platform | Architecture | Status |
|----------|-------------|--------|
| Windows  | x64         | ✅     |
| macOS    | x64 / ARM64 | ✅     |
| Linux    | x64         | ✅     |

## Install

```bash
npm install aaptjs3 --save
```

## Quick Start

```js
const aapt = require('aaptjs3');

// Dump APK metadata
const { stdout } = await aapt.dump('app.apk', 'badging');
console.log(stdout);

// Get structured APK info
const info = await aapt.getApkInfo('app.apk');
// { package: 'com.example.app', version: '1.0.0',
//   name: 'My App', icon: 'res/mipmap/ic_launcher.png' }

// List APK contents
const { stdout: files } = await aapt.list('app.apk');
```

## Custom Binary

Configure your own aapt binary — version auto-detected:

```js
const aapt = require('aaptjs3');

// Use a custom aapt binary
await aapt.configure({ binPath: '/path/to/custom/aapt' });

// If the path is broken or version can't be detected,
// falls back to built-in aapt2 with a warning.
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

### `configure(opts: { binPath?: string }): Promise<void>`

Configure a custom aapt binary. Version is auto-detected. All subsequent API calls use the configured binary. If the path is invalid or version unknown, falls back to built-in aapt2.

### `getBinPath(): string`

Returns the currently active aapt binary path.

### `aapt(commandArgs: string[], maxBuffer?: number): Promise<ExecResult>`

Low-level execution of the active aapt binary with arbitrary arguments.

### `dump(apkPath: string, value: string, extraArgs?: string[]): Promise<ExecResult>`

Dump APK information. Supported subcommands: `badging`, `strings`, `resources`, `permissions`, `configurations`, `packagename`, `styleparents`, `apc`, `overlayable`, `chunks`, `xmltree`, `xmlstrings`.

```js
// Simple dumping
await aapt.dump('app.apk', 'badging');
await aapt.dump('app.apk', 'permissions');
await aapt.dump('app.apk', 'packagename');

// xmltree/xmlstrings need --file flag
await aapt.dump('app.apk', 'xmltree', ['--file', 'AndroidManifest.xml']);
```

### `list(apkPath: string): Promise<ExecResult>`

List APK contents. In aapt2 mode, reads the ZIP central directory directly.

### `getApkInfo(apkPath: string): Promise<PackageInfo>`

Extract package name, version, app label, and icon.

### Deprecated APIs (aapt1 only)

These throw errors in default aapt2 mode. They work only if you configure a custom aapt1 binary:

| Function | aapt2 Replacement |
|----------|------------------|
| `packageCmd()` | `aapt2 compile` + `aapt2 link` |
| `remove()` | `aapt2 optimize` or zip tools |
| `add()` | `aapt2 compile` + `aapt2 link` |
| `crunch()` | `aapt2 compile` |
| `singleCrunch()` | `aapt2 compile` |

## Migration from v1.x

| v1.x | v2.x |
|------|------|
| `dump(apk, value)` | Same, or `dump(apk, value, extraArgs)` |
| `list(apk, args)` | `list(apk)` — args ignored, reads ZIP |
| `getApkInfo(apk)` | Same |
| `packageCmd()` | ❌ Throws |
| `remove()` / `add()` | ❌ Throws |
| `crunch()` / `singleCrunch()` | ❌ Throws |

## License

MIT
