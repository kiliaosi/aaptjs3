
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
export function aapt(commanArgs: string[], maxBuffer?: number): Promise<string>;
export function list(apkPath: string, args?: Array<string>): Promise<string>;
export function dump(apkPath: string, value: string): Promise<string>;
export function packageCmd(filePath: string, command: string): Promise<string>;
export function remove(filePath: string, files: string|string[]): Promise<string>;
export function add(filePath: string, files: string|string[]): Promise<string>;
export function crunch(resource: string|string[], outputFolder: string): Promise<string>;
export function singleCrunch(inputFile: string, outputFile: string): Promise<string>;
export function version(): Promise<string>;
export function getApkInfo(filePath: string): Promise<object>;
```
