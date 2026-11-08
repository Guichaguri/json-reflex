import { describe, expect, it, vi } from 'vitest';
import { StateContext } from '../../src/core/context.js';
import { ExpressionEngine } from '../../src/core/engine.js';
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
      .toThrow('Function not found: missing');
  });
});
