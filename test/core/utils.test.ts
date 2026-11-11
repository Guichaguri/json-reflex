import { describe, expect, it, vi } from 'vitest';
import { deepClone, setFromPath, walkThroughObject } from '../../src/core/utils.js';

describe('deepClone', () => {
  it('returns primitives as is', () => {
    expect(deepClone(1)).toBe(1);
    expect(deepClone('text')).toBe('text');
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
    expect(deepClone(undefined)).toBe(undefined);
  });

  it('clones nested objects into new instances', () => {
    const obj = { a: 1, b: { c: 'x', d: { e: null } } };
    const clone = deepClone(obj);

    expect(clone).toEqual(obj);
    expect(clone).not.toBe(obj);
    expect(clone.b).not.toBe(obj.b);
    expect(clone.b.d).not.toBe(obj.b.d);
  });

  it('clones arrays, including objects and arrays inside them', () => {
    const obj = { list: [1, 'a', null, { v: 1 }, [2, { w: 3 }]] };
    const clone = deepClone(obj);

    expect(clone).toEqual(obj);
    expect(Array.isArray(clone.list)).toBe(true);
    expect(clone.list).not.toBe(obj.list);
    expect(clone.list[3]).not.toBe(obj.list[3]);
    expect(clone.list[4]).not.toBe(obj.list[4]);
    expect((clone.list[4] as any[])[1]).not.toBe((obj.list[4] as any[])[1]);
  });

  it('clones a top-level array', () => {
    const arr = [{ a: 1 }, { b: 2 }];
    const clone = deepClone(arr);

    expect(clone).toEqual(arr);
    expect(clone).not.toBe(arr);
    expect(clone[0]).not.toBe(arr[0]);
  });

  it('does not affect the original when the clone is mutated', () => {
    const obj = { a: { b: [1, 2] } };
    const clone = deepClone(obj);
    clone.a.b.push(3);
    clone.a = { b: [] };

    expect(obj).toEqual({ a: { b: [1, 2] } });
  });

  it('keeps the original reference for skipped keys', () => {
    const children = [{ type: 'Text' }];
    const obj = { type: 'View', props: { style: { flex: 1 } }, children };
    const clone = deepClone(obj, ['children']);

    expect(clone).toEqual(obj);
    expect(clone.children).toBe(children);
    expect(clone.props).not.toBe(obj.props);
    expect(clone.props.style).not.toBe(obj.props.style);
  });

  it('skips keys at every depth', () => {
    const inner = [{ type: 'Text' }];
    const obj = { props: { slot: { children: inner, other: { a: 1 } } } };
    const clone = deepClone(obj, ['children']);

    expect(clone.props.slot.children).toBe(inner);
    expect(clone.props.slot.other).not.toBe(obj.props.slot.other);
  });

  it('supports multiple skipped keys', () => {
    const obj = { a: { x: 1 }, b: { y: 2 }, c: { z: 3 } };
    const clone = deepClone(obj, ['a', 'c']);

    expect(clone.a).toBe(obj.a);
    expect(clone.b).not.toBe(obj.b);
    expect(clone.c).toBe(obj.c);
  });

  it('does not skip array indices matching a skipped key', () => {
    const obj = { list: [{ a: 1 }] };
    const clone = deepClone(obj, ['0']);

    expect(clone.list[0]).not.toBe(obj.list[0]);
  });

  it('keeps "__proto__" as an own key without changing the prototype', () => {
    const obj = JSON.parse('{"a":{"__proto__":{"polluted":true}}}');
    const clone = deepClone(obj);

    expect(Object.getPrototypeOf(clone.a)).toBe(Object.prototype);
    expect(Object.hasOwn(clone.a, '__proto__')).toBe(true);
    expect(clone.a.polluted).toBeUndefined();
    expect(Object.getOwnPropertyDescriptor(clone.a, '__proto__')?.value).toEqual({ polluted: true });
    expect(Object.getOwnPropertyDescriptor(clone.a, '__proto__')?.value).not.toBe(
      Object.getOwnPropertyDescriptor(obj.a, '__proto__')?.value,
    );
    expect(({} as any).polluted).toBeUndefined();
  });
});

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

  it('skips keys and their subtrees', () => {
    const callback = vi.fn();
    walkThroughObject({ a: 1, children: [{ b: 2 }] }, callback, [], ['children']);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([], 'a', 1);
  });

  it('skips keys at every depth', () => {
    const visited: [string[], string, any][] = [];
    walkThroughObject({ props: { children: { a: 1 }, b: 2 } }, (path, key, value) => {
      visited.push([path, key, value]);
    }, [], ['children']);

    expect(visited).toEqual([
      [[], 'props', { children: { a: 1 }, b: 2 }],
      [['props'], 'b', 2],
    ]);
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
