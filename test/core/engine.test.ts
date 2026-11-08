import { describe, expect, it, vi } from 'vitest';
import { StateContext } from '../../src/core/context.js';
import { ExpressionEngine } from '../../src/core/engine.js';
import { ExpressionError } from '../../src/core/errors.js';
import type { ExpressionEngineOptions } from '../../src/core/types.js';

const options: ExpressionEngineOptions = {
  functions: new Map([['double', (n: number) => n * 2]]),
};

describe('ExpressionEngine', () => {
  it('evaluates expressions with the initial state', () => {
    const context = new StateContext(new Map([['name', 'John']]));
    const engine = new ExpressionEngine(context, {
      title: { $expr: '"Hello, " + name' },
      static: 'value',
    }, options);

    expect(engine.evaluated).toEqual({ title: 'Hello, John', static: 'value' });
  });

  it('evaluates nested expressions in objects and arrays', () => {
    const context = new StateContext(new Map([['n', 2]]));
    const engine = new ExpressionEngine(context, {
      nested: { deep: { value: { $expr: 'double(n)' } } },
      list: [{ $expr: 'n + 1' }, 'plain', { item: { $expr: 'n * 10' } }],
    }, options);

    expect(engine.evaluated).toEqual({
      nested: { deep: { value: 4 } },
      list: [3, 'plain', { item: 20 }],
    });
  });

  it('does not mutate the raw object', () => {
    const raw = { value: { $expr: 'a' } };
    new ExpressionEngine(new StateContext(new Map([['a', 1]])), raw, options);

    expect(raw).toEqual({ value: { $expr: 'a' } });
  });

  it('notifies subscribers when a dependency changes', () => {
    const context = new StateContext(new Map([['a', 1]]));
    const engine = new ExpressionEngine(context, { value: { $expr: 'a * 2' } }, options);
    const onChanged = vi.fn();
    engine.subscribe(onChanged);

    context.setState([['a', 5]]);

    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(onChanged).toHaveBeenCalledWith({ value: 10 });
    expect(engine.evaluated).toEqual({ value: 10 });
  });

  it('does not notify subscribers when unrelated state changes', () => {
    const context = new StateContext(new Map([['a', 1]]));
    const engine = new ExpressionEngine(context, { value: { $expr: 'a' } }, options);
    const onChanged = vi.fn();
    engine.subscribe(onChanged);

    context.setState([['b', 2]]);

    expect(onChanged).not.toHaveBeenCalled();
  });

  it('does not notify subscribers when a dependency is set to the same value', () => {
    const context = new StateContext(new Map([['a', 1]]));
    const engine = new ExpressionEngine(context, { value: { $expr: 'a' } }, options);
    const onChanged = vi.fn();
    engine.subscribe(onChanged);

    context.setState([['a', 1]]);

    expect(onChanged).not.toHaveBeenCalled();
  });

  it('tracks dependencies across all expressions', () => {
    const context = new StateContext();
    const engine = new ExpressionEngine(context, {
      first: { $expr: 'a' },
      second: { $expr: 'b ? c : 0' },
    }, options);
    const onChanged = vi.fn();
    engine.subscribe(onChanged);

    context.setState([['c', 3]]);
    context.setState([['b', true]]);

    expect(onChanged).toHaveBeenCalledTimes(2);
    expect(engine.evaluated).toEqual({ first: undefined, second: 3 });
  });

  it('stops notifying after unsubscribing', () => {
    const context = new StateContext(new Map([['a', 1]]));
    const engine = new ExpressionEngine(context, { value: { $expr: 'a' } }, options);
    const onChanged = vi.fn();
    const unsubscribe = engine.subscribe(onChanged);

    unsubscribe();
    context.setState([['a', 2]]);

    expect(onChanged).not.toHaveBeenCalled();
  });

  it('re-evaluates with the current state on update', () => {
    const context = new StateContext(new Map([['a', 1]]));
    const engine = new ExpressionEngine(context, { value: { $expr: 'a' } }, options);

    context.getState().set('a', 42);
    expect(engine.evaluated).toEqual({ value: 1 });

    engine.update();
    expect(engine.evaluated).toEqual({ value: 42 });
  });

  it('handles objects without expressions', () => {
    const context = new StateContext();
    const engine = new ExpressionEngine(context, { a: 1, b: { c: 'x' } }, options);
    const onChanged = vi.fn();
    engine.subscribe(onChanged);

    context.setState([['a', 2]]);

    expect(engine.evaluated).toEqual({ a: 1, b: { c: 'x' } });
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('throws when an expression uses an unknown function', () => {
    const context = new StateContext();

    expect(() => new ExpressionEngine(context, { value: { $expr: 'missing()' } }, options))
      .toThrow('Failed to evaluate expression "missing()" at "value": Unknown function "missing"');
  });

  describe('errors', () => {
    it('wraps errors with the expression and its path', () => {
      const context = new StateContext();
      let thrown: unknown;
      try {
        new ExpressionEngine(context, { list: [{ title: { $expr: 'a +' } }] }, options);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(ExpressionError);
      const error = thrown as ExpressionError;
      expect(error.expression).toBe('a +');
      expect(error.path).toEqual(['list', '0', 'title']);
      expect(error.phase).toBe('parse');
      expect(error.cause).toBeInstanceOf(Error);
      expect(error.message).toMatch(/^Failed to parse expression "a \+" at "list\.0\.title": /);
    });

    it('reports a non-string $expr', () => {
      const context = new StateContext();

      expect(() => new ExpressionEngine(context, { value: { $expr: 42 } } as any, options))
        .toThrow('"$expr" must be a string, but got number');
      expect(() => new ExpressionEngine(context, { value: { $expr: null } } as any, options))
        .toThrow('"$expr" must be a string, but got null');
    });

    it('passes errors to onError and sets the value to undefined', () => {
      const onError = vi.fn();
      const context = new StateContext();
      const engine = new ExpressionEngine(context, {
        broken: { $expr: 'missing()' },
        invalid: { $expr: 'a.b' },
        ok: { $expr: '1 + 1' },
      }, { ...options, onError });

      expect(engine.evaluated).toEqual({ broken: undefined, invalid: undefined, ok: 2 });
      expect(onError).toHaveBeenCalledTimes(2);
      expect(onError.mock.calls.map(([error]) => [error.phase, error.path])).toEqual([
        ['parse', ['invalid']],
        ['evaluate', ['broken']],
      ]);
    });

    it('throws an AggregateError when several expressions fail without onError', () => {
      const context = new StateContext();

      expect(() => new ExpressionEngine(context, { a: { $expr: 'x()' }, b: { $expr: 'y()' } }, options))
        .toThrow(AggregateError);
    });

    it('keeps updating the other expressions and engines when one fails', () => {
      const context = new StateContext();
      const failing = new ExpressionEngine(context, {
        broken: { $expr: 'x ? missing() : 1' },
        ok: { $expr: 'x' },
      }, options);
      const other = new ExpressionEngine(context, { value: { $expr: 'x' } }, options);
      const onFailingChanged = vi.fn();
      const onOtherChanged = vi.fn();
      failing.subscribe(onFailingChanged);
      other.subscribe(onOtherChanged);

      expect(() => context.setState([['x', true]])).not.toThrow();

      expect(failing.evaluated).toEqual({ broken: undefined, ok: true });
      expect(onFailingChanged).toHaveBeenCalledTimes(1);
      expect(other.evaluated).toEqual({ value: true });
      expect(onOtherChanged).toHaveBeenCalledTimes(1);
    });

    it('recovers once the expression succeeds again', () => {
      const onError = vi.fn();
      const context = new StateContext(new Map([['x', false]]));
      const engine = new ExpressionEngine(context, { value: { $expr: 'x ? missing() : 1' } }, { ...options, onError });
      engine.subscribe(() => {});

      context.setState([['x', true]]);
      expect(engine.evaluated).toEqual({ value: undefined });

      context.setState([['x', false]]);
      expect(engine.evaluated).toEqual({ value: 1 });
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe('cloning', () => {
    it('uses structuredClone by default', () => {
      const spy = vi.spyOn(globalThis, 'structuredClone');
      const raw = { nested: { value: { $expr: '1' } } };
      const engine = new ExpressionEngine(new StateContext(), raw, options);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(engine.evaluated).toEqual({ nested: { value: 1 } });
      expect(raw).toEqual({ nested: { value: { $expr: '1' } } });
      spy.mockRestore();
    });

    it('falls back to JSON when structuredClone is not available', () => {
      vi.stubGlobal('structuredClone', undefined);
      try {
        const raw = { nested: { value: { $expr: '1' } } };
        const engine = new ExpressionEngine(new StateContext(), raw, options);

        expect(engine.evaluated).toEqual({ nested: { value: 1 } });
        expect(raw).toEqual({ nested: { value: { $expr: '1' } } });
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('uses a custom deepClone function', () => {
      const deepClone = vi.fn(<T,>(object: T): T => JSON.parse(JSON.stringify(object)));
      new ExpressionEngine(new StateContext(), { value: { $expr: '1' } }, { ...options, deepClone: deepClone as <T>(object: T) => T });

      expect(deepClone).toHaveBeenCalledTimes(1);
    });

    it('mutates the raw object when deepClone is false', () => {
      const raw = { value: { $expr: '1' } };
      const engine = new ExpressionEngine(new StateContext(), raw, { ...options, deepClone: false });

      expect(engine.evaluated).toBe(raw);
      expect(raw).toEqual({ value: 1 });
    });
  });

  describe('prototype keys', () => {
    const evaluate = (json: string) => new ExpressionEngine(new StateContext(), JSON.parse(json), options).evaluated as any;

    it('treats __proto__ as an ordinary key', () => {
      const evaluated = evaluate('{ "__proto__": { "$expr": "1" }, "nested": { "__proto__": { "polluted": { "$expr": "true" } } } }');

      expect(Object.getPrototypeOf(evaluated)).toBe(Object.prototype);
      expect(Object.getOwnPropertyDescriptor(evaluated, '__proto__')?.value).toBe(1);
      expect(Object.getOwnPropertyDescriptor(evaluated.nested, '__proto__')?.value).toEqual({ polluted: true });
      expect(({} as any).polluted).toBeUndefined();
    });

    it('treats constructor and prototype as ordinary keys', () => {
      const evaluated = evaluate('{ "constructor": { "prototype": { "polluted": { "$expr": "true" } } } }');

      expect(Object.hasOwn(evaluated, 'constructor')).toBe(true);
      expect(evaluated.constructor).toEqual({ prototype: { polluted: true } });
      expect(({} as any).polluted).toBeUndefined();
      expect((Object.prototype as any).polluted).toBeUndefined();
    });
  });
});
