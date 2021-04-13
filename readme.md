<!--
 * @Author: kiliaosi
 * @Date: 2021-04-13 12:44:31
 * @LastEditors: kiliaosi
 * @LastEditTime: 2021-04-13 16:25:17
 * @Description:
-->

# aaptjs3
Implementation of aapt in nodejs

## install

- in npm
```bash
npm install aaptjs3 --save
```

- in yarn
```bash
yarn add aaptjs3
```

## Example

```js
const aapt = require('aaptjs3');

aapt.list('/path/to/your/ExampleApp.apk', ['-a'])
  .then (data => {
    // Your implementation
  })
  .catch ((err) => {
    // Your implementation
  });
```

## API
```typescript
interface ExecResult {
  stdout: string,
  stderr: string,
}

interface PackageInfo {
  package: string,
  version: string,
  name: string,
  icon: string,
}

export function aapt(commanArgs: string[], maxBuffer?: number): Promise<ExecResult>;
export function list(apkPath: string, args?: Array<string>): Promise<ExecResult>;
export function dump(apkPath: string, value: string): Promise<ExecResult>;
export function packageCmd(filePath: string, command: string): Promise<ExecResult>;
export function remove(filePath: string, files: string|string[]): Promise<ExecResult>;
export function add(filePath: string, files: string|string[]): Promise<ExecResult>;
export function crunch(resource: string|string[], outputFolder: string): Promise<ExecResult>;
export function singleCrunch(inputFile: string, outputFile: string): Promise<ExecResult>;
export function getApkInfo(filePath: string): Promise<PackageInfo>;
```
