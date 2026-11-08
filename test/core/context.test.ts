import { describe, expect, it, vi } from 'vitest';
import { StateContext } from '../../src/core/context.js';

describe('StateContext', () => {
  it('starts with an empty state by default', () => {
    const context = new StateContext();

    expect(context.getState()).toBeInstanceOf(Map);
    expect(context.getState().size).toBe(0);
  });

  it('uses the provided initial state', () => {
    const initial = new Map([['a', 1]]);
    const context = new StateContext(initial);

    expect(context.getState()).toBe(initial);
    expect(context.getState().get('a')).toBe(1);
  });

  it('updates the state with the given entries', () => {
    const context = new StateContext(new Map([['a', 1]]));
    context.setState([['a', 2], ['b', 'x']]);

    expect(context.getState().get('a')).toBe(2);
    expect(context.getState().get('b')).toBe('x');
  });

  it('notifies listeners with the state and the changed properties', () => {
    const context = new StateContext(new Map([['a', 1], ['b', 2]]));
    const listener = vi.fn();
    context.subscribe(listener);

    context.setState([['a', 1], ['b', 3], ['c', 4]]);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(context.getState(), ['b', 'c']);
  });

  it('does not notify listeners when nothing changed', () => {
    const context = new StateContext(new Map([['a', 1]]));
    const listener = vi.fn();
    context.subscribe(listener);

    context.setState([['a', 1]]);

    expect(listener).not.toHaveBeenCalled();
  });

  it('compares values by reference', () => {
    const regex = /abc/;
    const context = new StateContext(new Map([['a', regex]]));
    const listener = vi.fn();
    context.subscribe(listener);

    context.setState([['a', /abc/]]);

    expect(listener).toHaveBeenCalledWith(context.getState(), ['a']);
  });

  it('notifies every subscribed listener', () => {
    const context = new StateContext();
    const first = vi.fn();
    const second = vi.fn();
    context.subscribe(first);
    context.subscribe(second);

    context.setState([['a', 1]]);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops notifying a listener after unsubscribing', () => {
    const context = new StateContext();
    const kept = vi.fn();
    const removed = vi.fn();
    context.subscribe(kept);
    const unsubscribe = context.subscribe(removed);

    unsubscribe();
    context.setState([['a', 1]]);

    expect(kept).toHaveBeenCalledTimes(1);
    expect(removed).not.toHaveBeenCalled();
  });

  it('notifies every listener even when one throws', () => {
    const context = new StateContext();
    const after = vi.fn();
    context.subscribe(() => { throw new Error('boom'); });
    context.subscribe(after);

    expect(() => context.setState([['a', 1]])).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
    expect(context.getState().get('a')).toBe(1);
  });

  it('does not throw when several listeners throw', () => {
    const context = new StateContext();
    context.subscribe(() => { throw new Error('first'); });
    context.subscribe(() => { throw new Error('second'); });

    expect(() => context.setState([['a', 1]])).not.toThrow();
  });

  describe('toggleState', () => {
    it('negates boolean values', () => {
      const context = new StateContext(new Map([['a', true], ['b', false]]));
      context.toggleState(['a', 'b']);

      expect(context.getState().get('a')).toBe(false);
      expect(context.getState().get('b')).toBe(true);
    });

    it('sets missing keys to true', () => {
      const context = new StateContext();
      context.toggleState(['a']);

      expect(context.getState().get('a')).toBe(true);
    });

    it('negates non-boolean values by truthiness', () => {
      const context = new StateContext(new Map<string, any>([
        ['zero', 0],
        ['one', 1],
        ['empty', ''],
        ['text', 'abc'],
        ['nil', null],
      ]));
      context.toggleState(['zero', 'one', 'empty', 'text', 'nil']);

      expect(context.getState().get('zero')).toBe(true);
      expect(context.getState().get('one')).toBe(false);
      expect(context.getState().get('empty')).toBe(true);
      expect(context.getState().get('text')).toBe(false);
      expect(context.getState().get('nil')).toBe(true);
    });

    it('restores the original value when toggled twice', () => {
      const context = new StateContext(new Map([['a', true]]));
      context.toggleState(['a']);
      context.toggleState(['a']);

      expect(context.getState().get('a')).toBe(true);
    });

    it('leaves keys that were not given untouched', () => {
      const context = new StateContext(new Map([['a', true], ['b', true]]));
      context.toggleState(['a']);

      expect(context.getState().get('b')).toBe(true);
    });

    it('notifies listeners once with all toggled keys', () => {
      const context = new StateContext(new Map([['a', true], ['b', false]]));
      const listener = vi.fn();
      context.subscribe(listener);

      context.toggleState(['a', 'b']);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(context.getState(), ['a', 'b']);
    });

    it('does not notify listeners when no keys are given', () => {
      const context = new StateContext();
      const listener = vi.fn();
      context.subscribe(listener);

      context.toggleState([]);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('incrementState', () => {
    it('increments number values', () => {
      const context = new StateContext(new Map([['a', 1], ['b', 10]]));
      context.incrementState(['a', 'b'], 5);

      expect(context.getState().get('a')).toBe(6);
      expect(context.getState().get('b')).toBe(15);
    });

    it('decrements with a negative amount', () => {
      const context = new StateContext(new Map([['a', 1]]));
      context.incrementState(['a'], -3);

      expect(context.getState().get('a')).toBe(-2);
    });

    it('supports fractional amounts on numbers', () => {
      const context = new StateContext(new Map([['a', 1]]));
      context.incrementState(['a'], 0.5);

      expect(context.getState().get('a')).toBe(1.5);
    });

    it('converts booleans to numbers before incrementing', () => {
      const context = new StateContext(new Map([['t', true], ['f', false]]));
      context.incrementState(['t', 'f'], 1);

      expect(context.getState().get('t')).toBe(2);
      expect(context.getState().get('f')).toBe(1);
    });

    it('converts numeric strings to numbers before incrementing', () => {
      const context = new StateContext(new Map([['a', '5'], ['empty', '']]));
      context.incrementState(['a', 'empty'], 2);

      expect(context.getState().get('a')).toBe(7);
      expect(context.getState().get('empty')).toBe(2);
    });

    it('produces NaN for non-numeric strings', () => {
      const context = new StateContext(new Map([['a', 'abc']]));
      context.incrementState(['a'], 1);

      expect(context.getState().get('a')).toBeNaN();
    });

    it('increments bigint values keeping the bigint type', () => {
      const context = new StateContext(new Map([['a', 10n]]));
      context.incrementState(['a'], 5);

      expect(context.getState().get('a')).toBe(15n);
    });

    it('throws when incrementing a bigint by a fractional amount', () => {
      const context = new StateContext(new Map([['a', 10n]]));

      expect(() => context.incrementState(['a'], 0.5)).toThrow(RangeError);
      expect(context.getState().get('a')).toBe(10n);
    });

    it('replaces null, undefined and RegExp values with the amount', () => {
      const context = new StateContext(new Map<string, any>([
        ['nil', null],
        ['undef', undefined],
        ['regex', /abc/],
      ]));
      context.incrementState(['nil', 'undef', 'regex'], 3);

      expect(context.getState().get('nil')).toBe(3);
      expect(context.getState().get('undef')).toBe(3);
      expect(context.getState().get('regex')).toBe(3);
    });

    it('creates missing keys with the amount', () => {
      const context = new StateContext();
      context.incrementState(['a'], 2);

      expect(context.getState().get('a')).toBe(2);
    });

    it('creates missing keys with a negative amount when decrementing', () => {
      const context = new StateContext();
      context.incrementState(['a'], -1);

      expect(context.getState().get('a')).toBe(-1);
    });

    it('notifies listeners once with only the keys that changed', () => {
      const context = new StateContext(new Map<string, any>([['a', 1], ['b', null], ['c', 2]]));
      const listener = vi.fn();
      context.subscribe(listener);

      context.incrementState(['a', 'b', 'c', 'missing'], 1);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(context.getState(), ['a', 'b', 'c', 'missing']);
    });

    it('does not report a key as changed when the value already equals the amount', () => {
      const context = new StateContext(new Map<string, any>([['a', 0]]));
      const listener = vi.fn();
      context.subscribe(listener);

      context.incrementState(['a'], 0);
      context.incrementState(['missing'], 0);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(context.getState(), ['missing']);
    });

    it('reports no changes when the amount is zero', () => {
      const context = new StateContext(new Map([['a', 1]]));
      const listener = vi.fn();
      context.subscribe(listener);

      context.incrementState(['a'], 0);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
