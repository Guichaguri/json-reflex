import { describe, expect, it, vi } from 'vitest';
import { setFromPath, walkThroughObject } from '../../src/core/utils.js';

describe('walkThroughObject', () => {
  it('visits every property with its path and key', () => {
    const visited: [string[], string, any][] = [];
    walkThroughObject({ a: 1, b: { c: 2, d: { e: 3 } } }, (path, key, value) => {
      visited.push([path, key, value]);
    });

    expect(visited).toEqual([
      [[], 'a', 1],
      [[], 'b', { c: 2, d: { e: 3 } }],
      [['b'], 'c', 2],
      [['b'], 'd', { e: 3 }],
      [['b', 'd'], 'e', 3],
    ]);
  });

  it('walks through arrays using their indices as keys', () => {
    const visited: [string[], string, any][] = [];
    walkThroughObject({ list: ['x', { y: 1 }] }, (path, key, value) => {
      visited.push([path, key, value]);
    });

    expect(visited).toEqual([
      [[], 'list', ['x', { y: 1 }]],
      [['list'], '0', 'x'],
      [['list'], '1', { y: 1 }],
      [['list', '1'], 'y', 1],
    ]);
  });

  it('does not recurse into null values', () => {
    const callback = vi.fn();
    walkThroughObject({ a: null }, callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([], 'a', null);
  });

  it('skips inherited properties', () => {
    const obj = Object.create({ inherited: true });
    obj.own = 1;
    const callback = vi.fn();
    walkThroughObject(obj, callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([], 'own', 1);
  });

  it('prefixes paths with the base path', () => {
    const callback = vi.fn();
    walkThroughObject({ a: 1 }, callback, ['root']);

    expect(callback).toHaveBeenCalledWith(['root'], 'a', 1);
  });

  it('does nothing for an empty object', () => {
    const callback = vi.fn();
    walkThroughObject({}, callback);

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('setFromPath', () => {
  it('sets a top-level value when the path is empty', () => {
    const obj: any = {};
    setFromPath(obj, [], 'a', 1);

    expect(obj).toEqual({ a: 1 });
  });

  it('sets a nested value on existing objects', () => {
    const obj: any = { a: { b: { c: 1 } } };
    setFromPath(obj, ['a', 'b'], 'c', 2);

    expect(obj).toEqual({ a: { b: { c: 2 } } });
  });

  it('creates missing intermediate objects', () => {
    const obj: any = { a: {} };
    setFromPath(obj, ['a', 'b', 'c'], 'd', true);

    expect(obj).toEqual({ a: { b: { c: { d: true } } } });
  });

  it('sets values inside arrays', () => {
    const obj: any = { list: [{ v: 1 }, { v: 2 }] };
    setFromPath(obj, ['list', '1'], 'v', 3);

    expect(obj.list).toEqual([{ v: 1 }, { v: 3 }]);
  });

  it('preserves sibling properties', () => {
    const obj: any = { a: { x: 1, y: 2 } };
    setFromPath(obj, ['a'], 'x', 10);

    expect(obj).toEqual({ a: { x: 10, y: 2 } });
  });
});
