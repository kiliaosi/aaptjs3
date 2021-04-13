/*
 * @Author: kiliaosi
 * @Date: 2021-04-13 11:19:57
 * @LastEditors: kiliaosi
 * @LastEditTime: 2021-04-13 12:55:49
 * @Description:
 */
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
