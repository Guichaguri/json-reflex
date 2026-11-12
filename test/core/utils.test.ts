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

  it('keeps the original reference for a skipped top-level path', () => {
    const children = [{ type: 'Text' }];
    const obj = { type: 'View', props: { style: { flex: 1 } }, children };
    const clone = deepClone(obj, { children: true });

    expect(clone).toEqual(obj);
    expect(clone.children).toBe(children);
    expect(clone.props).not.toBe(obj.props);
    expect(clone.props.style).not.toBe(obj.props.style);
  });

  it('keeps the original reference for a skipped nested path', () => {
    const obj = { props: { slot: { children: [{ a: 1 }], other: { b: 2 } } } };
    const clone = deepClone(obj, { props: { slot: { children: true } } });

    expect(clone).toEqual(obj);
    expect(clone.props.slot.children).toBe(obj.props.slot.children);
    expect(clone.props).not.toBe(obj.props);
    expect(clone.props.slot).not.toBe(obj.props.slot);
    expect(clone.props.slot.other).not.toBe(obj.props.slot.other);
  });

  it('only skips the exact path, not the same key elsewhere', () => {
    const obj = { children: { a: 1 }, props: { children: { b: 2 } } };
    const clone = deepClone(obj, { props: { children: true } });

    expect(clone.props.children).toBe(obj.props.children);
    expect(clone.children).not.toBe(obj.children);
  });

  it('matches array indices', () => {
    const obj = { list: [{ children: { a: 1 } }, { children: { b: 2 } }, { children: { c: 3 } }] };
    const clone = deepClone(obj, { list: { 0: { children: true }, 2: { children: true } } });

    expect(clone.list[0]!.children).toBe(obj.list[0]!.children);
    expect(clone.list[1]!.children).not.toBe(obj.list[1]!.children);
    expect(clone.list[2]!.children).toBe(obj.list[2]!.children);
    expect(clone.list[0]).not.toBe(obj.list[0]);
  });

  it('skips a whole array element', () => {
    const obj = { list: [{ a: 1 }, { b: 2 }] };
    const clone = deepClone(obj, { list: { 1: true } });

    expect(clone.list[0]).not.toBe(obj.list[0]);
    expect(clone.list[1]).toBe(obj.list[1]);
  });

  it('supports multiple paths', () => {
    const obj = { a: { x: 1 }, b: { y: 2 }, c: { z: { w: 3 } } };
    const clone = deepClone(obj, { a: true, c: { z: true } });

    expect(clone.a).toBe(obj.a);
    expect(clone.b).not.toBe(obj.b);
    expect(clone.c).not.toBe(obj.c);
    expect(clone.c.z).toBe(obj.c.z);
  });

  it('clones everything with an empty tree', () => {
    const obj = { a: { b: 1 } };
    const clone = deepClone(obj, {});

    expect(clone).toEqual(obj);
    expect(clone.a).not.toBe(obj.a);
  });

  it('ignores paths that do not exist', () => {
    const obj = { a: { b: 1 } };
    const clone = deepClone(obj, { missing: { key: true }, a: { b: { c: true } } });

    expect(clone).toEqual(obj);
    expect(clone.a).not.toBe(obj.a);
  });

  it('does not match inherited properties of the tree as path segments', () => {
    const obj = { constructor: { a: 1 }, toString: { b: 2 } };
    const clone = deepClone(obj, { other: true });

    expect(clone.constructor).not.toBe(obj.constructor);
    expect(clone.toString).not.toBe(obj.toString);
    expect(clone).toEqual(obj);
  });

  it('skips a "__proto__" path as an ordinary key', () => {
    const obj = JSON.parse('{"__proto__":{"a":1},"b":{"c":2}}');
    const tree = Object.create(null);
    tree['__proto__'] = true;
    const clone = deepClone(obj, tree);

    expect(Object.getOwnPropertyDescriptor(clone, '__proto__')?.value).toBe(
      Object.getOwnPropertyDescriptor(obj, '__proto__')?.value,
    );
    expect(Object.getPrototypeOf(clone)).toBe(Object.prototype);
    expect(clone.b).not.toBe(obj.b);
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
    }, () => false);

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
    }, () => false);

    expect(visited).toEqual([
      [[], 'list', ['x', { y: 1 }]],
      [['list'], '0', 'x'],
      [['list'], '1', { y: 1 }],
      [['list', '1'], 'y', 1],
    ]);
  });

  it('does not recurse into null values', () => {
    const callback = vi.fn();
    walkThroughObject({ a: null }, callback, () => false);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([], 'a', null);
  });

  it('skips inherited properties', () => {
    const obj = Object.create({ inherited: true });
    obj.own = 1;
    const callback = vi.fn();
    walkThroughObject(obj, callback, () => false);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([], 'own', 1);
  });

  it('prefixes paths with the base path', () => {
    const callback = vi.fn();
    walkThroughObject({ a: 1 }, callback, () => false, ['root']);

    expect(callback).toHaveBeenCalledWith(['root'], 'a', 1);
  });

  it('calls shouldSkip for every property, with its path, key and value', () => {
    const shouldSkip = vi.fn(() => false);
    const value = { a: 1, b: { c: null, d: [2] } };
    walkThroughObject(value, () => {}, shouldSkip);

    expect(shouldSkip.mock.calls).toEqual([
      [[], 'a', 1],
      [[], 'b', value.b],
      [['b'], 'c', null],
      [['b'], 'd', value.b.d],
      [['b', 'd'], '0', 2],
    ]);
  });

  it('does not visit a skipped value or what is inside it', () => {
    const visited: [string[], string, any][] = [];
    const shouldSkip = vi.fn((_path: string[], key: string) => key === 'children');
    walkThroughObject({ a: 1, children: [{ b: 2 }] }, (path, key, value) => {
      visited.push([path, key, value]);
    }, shouldSkip);

    expect(visited).toEqual([[[], 'a', 1]]);
    expect(shouldSkip).not.toHaveBeenCalledWith(['children'], '0', expect.anything());
  });

  it('skips primitive values', () => {
    const callback = vi.fn();
    walkThroughObject({ a: 1, b: 2 }, callback, (_path, key) => key === 'a');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([], 'b', 2);
  });

  it('skips values at any depth', () => {
    const visited: [string[], string, any][] = [];
    walkThroughObject({ props: { children: { a: 1 }, b: 2 } }, (path, key, value) => {
      visited.push([path, key, value]);
    }, (path, key) => path.length === 1 && key === 'children');

    expect(visited).toEqual([
      [[], 'props', { children: { a: 1 }, b: 2 }],
      [['props'], 'b', 2],
    ]);
  });

  it('does nothing for an empty object', () => {
    const callback = vi.fn();
    walkThroughObject({}, callback, () => false);

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
