import type { ExpressionFunction } from '../core/types.js';

const ensureStr = (str: any): string => (str ?? '').toString();

export const stringFunctions = new Map<string, ExpressionFunction>([
  ['length', (str: string) => ensureStr(str).length],
  ['toUpperCase', (str: string) => ensureStr(str).toUpperCase()],
  ['toLowerCase', (str: string) => ensureStr(str).toLowerCase()],
  ['substring', (str: string, start: number, end?: number) => ensureStr(str).substring(start, end)],
  ['concat', (str: string, ...args: any[]) => ensureStr(str) + args.map(arg => ensureStr(arg)).join('')],
  ['trim', (str: string) => ensureStr(str).trim()],
  ['replace', (str: string, searchValue: string, replaceValue: string) => ensureStr(str).replace(searchValue, replaceValue)],
  ['includes', (str: string, needle: string) => ensureStr(str).includes(needle)],
  ['startsWith', (str: string, needle: string) => ensureStr(str).startsWith(needle)],
  ['endsWith', (str: string, needle: string) => ensureStr(str).endsWith(needle)],
  ['indexOf', (str: string, needle: string) => ensureStr(str).indexOf(needle)],
  ['lastIndexOf', (str: string, needle: string) => ensureStr(str).lastIndexOf(needle)],
  ['padStart', (str: string, targetLength: number, padString?: string) => ensureStr(str).padStart(targetLength, padString)],
  ['padEnd', (str: string, targetLength: number, padString?: string) => ensureStr(str).padEnd(targetLength, padString)],
  ['repeat', (str: string, count: number) => ensureStr(str).repeat(count)],
]);

export const mathFunctions = new Map<string, ExpressionFunction>([
  ['max', Math.max],
  ['min', Math.min],
  ['abs', Math.abs],
  ['round', Math.round],
  ['floor', Math.floor],
  ['ceil', Math.ceil],
  ['sqrt', Math.sqrt],
  ['pow', Math.pow],
  ['log', Math.log],
  ['exp', Math.exp],
  ['sin', Math.sin],
  ['cos', Math.cos],
  ['tan', Math.tan],
  ['asin', Math.asin],
  ['acos', Math.acos],
  ['atan', Math.atan],
]);

export const stdFunctions = new Map<string, ExpressionFunction>([
  ...stringFunctions,
  ...mathFunctions,
]);
