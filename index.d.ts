/*
 * aaptjs3 v2.x — aapt2 Node.js wrapper
 */

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

interface ConfigureOptions {
  /** User-provided aapt binary path. If set, version is auto-detected. */
  binPath?: string;
}

/**
 * Configure a custom aapt binary. Must be called before other functions.
 * If the path is invalid or version cannot be determined, falls back to built-in aapt2.
 */
export function configure(opts: ConfigureOptions): Promise<void>;

/** Get the currently active aapt binary path. */
export function getBinPath(): string;

/** Version constants for the active tool. */
export const VERSION: { UNKNOWN: 0; AAPT1: 1; AAPT2: 2 };

/**
 * Low-level aapt execution. Runs the currently configured binary with arbitrary args.
 */
export function aapt(commandArgs: string[], maxBuffer?: number): Promise<ExecResult>;

/**
 * List contents of an APK file.
 * - aapt1 mode: runs `aapt l <apkPath>`
 * - aapt2 mode: reads ZIP central directory (aapt2 removed the list command)
 */
export function list(apkPath: string, args?: string[]): Promise<ExecResult>;

/**
 * Dump APK information. Common values: badging, strings, resources,
 * permissions, configurations, packagename, styleparents, apc, overlayable, chunks.
 *
 * For xmltree/xmlstrings, pass the file path via extraArgs:
 *   dump(apkPath, 'xmltree', ['--file', 'AndroidManifest.xml'])
 */
export function dump(apkPath: string, value: string, extraArgs?: string[]): Promise<ExecResult>;

/**
 * @deprecated Removed in aapt2. Throws in aapt2 mode.
 */
export function packageCmd(filePath: string, command: string): Promise<ExecResult>;

/**
 * @deprecated Removed in aapt2. Throws in aapt2 mode.
 */
export function remove(filePath: string, files: string | string[]): Promise<ExecResult>;

/**
 * @deprecated Removed in aapt2. Throws in aapt2 mode.
 */
export function add(filePath: string, files: string | string[]): Promise<ExecResult>;

/**
 * @deprecated Removed in aapt2. Throws in aapt2 mode.
 */
export function crunch(resource: string | string[], outputFolder: string): Promise<ExecResult>;

/**
 * @deprecated Removed in aapt2. Throws in aapt2 mode.
 */
export function singleCrunch(inputFile: string, outputFile: string): Promise<ExecResult>;

/**
 * Extract package name, version, app label, and icon from an APK.
 */
export function getApkInfo(filePath: string): Promise<PackageInfo>;
