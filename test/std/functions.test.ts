import { describe, expect, it } from 'vitest';
import { mathFunctions, stdFunctions, stringFunctions } from '../../src/std/index.js';

function call(name: string, ...args: any[]): any {
  const fn = stdFunctions.get(name);
  if (!fn) throw new Error(`Missing function: ${name}`);
  return fn(...args);
}

describe('stringFunctions', () => {
  it.each([
    ['length', ['hello'], 5],
    ['toUpperCase', ['hello'], 'HELLO'],
    ['toLowerCase', ['HeLLo'], 'hello'],
    ['substring', ['hello', 1, 3], 'el'],
    ['substring', ['hello', 2], 'llo'],
    ['concat', ['a', 'b', 1, true], 'ab1true'],
    ['concat', ['a'], 'a'],
    ['trim', ['  hi  '], 'hi'],
    ['replace', ['a-b-c', '-', '+'], 'a+b-c'],
    ['includes', ['hello', 'ell'], true],
    ['includes', ['hello', 'xyz'], false],
    ['startsWith', ['hello', 'he'], true],
    ['endsWith', ['hello', 'lo'], true],
    ['indexOf', ['hello', 'l'], 2],
    ['lastIndexOf', ['hello', 'l'], 3],
    ['padStart', ['5', 3, '0'], '005'],
    ['padStart', ['5', 3], '  5'],
    ['padEnd', ['5', 3, '0'], '500'],
    ['padEnd', ['5', 3], '5  '],
    ['repeat', ['ab', 3], 'ababab'],
  ])('%s(%j) returns %j', (name, args, expected) => {
    expect(call(name, ...args)).toBe(expected);
  });

  it.each([null, undefined])('treats %s as an empty string', (value) => {
    expect(call('length', value)).toBe(0);
    expect(call('toUpperCase', value)).toBe('');
    expect(call('concat', value, 'a', value)).toBe('a');
  });

  it('converts non-string values to strings', () => {
    expect(call('length', 12345)).toBe(5);
    expect(call('includes', 123, '2')).toBe(true);
    expect(call('padStart', 7, 2, '0')).toBe('07');
  });

  it('caps the length of padStart and padEnd at 10,000 characters', () => {
    expect(call('padStart', 'a', 1e9)).toHaveLength(10_000);
    expect(call('padEnd', 'a', 1e9, '0')).toHaveLength(10_000);
  });

  it('caps the repeat count at 10,000', () => {
    expect(call('repeat', 'a', 1e9)).toHaveLength(10_000);
    expect(call('repeat', 'a', Infinity)).toHaveLength(10_000);
  });
});

describe('mathFunctions', () => {
  it.each([
    ['max', [1, 5, 3], 5],
    ['min', [1, 5, 3], 1],
    ['abs', [-4], 4],
    ['round', [2.5], 3],
    ['floor', [2.9], 2],
    ['ceil', [2.1], 3],
    ['sqrt', [16], 4],
    ['pow', [2, 10], 1024],
    ['log', [1], 0],
    ['exp', [0], 1],
    ['sin', [0], 0],
    ['cos', [0], 1],
    ['tan', [0], 0],
    ['asin', [0], 0],
    ['acos', [1], 0],
    ['atan', [0], 0],
  ])('%s(%j) returns %j', (name, args, expected) => {
    expect(call(name, ...args)).toBe(expected);
  });
});

describe('stdFunctions', () => {
  it('contains every string and math function', () => {
    expect(stdFunctions.size).toBe(stringFunctions.size + mathFunctions.size);

    for (const [name, fn] of [...stringFunctions, ...mathFunctions]) {
      expect(stdFunctions.get(name)).toBe(fn);
    }
  });
});
