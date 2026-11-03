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

  it('notifies listeners with no changed properties when nothing changed', () => {
    const context = new StateContext(new Map([['a', 1]]));
    const listener = vi.fn();
    context.subscribe(listener);

    context.setState([['a', 1]]);

    expect(listener).toHaveBeenCalledWith(context.getState(), []);
  });

  it('compares values by reference', () => {
    const obj = { x: 1 };
    const context = new StateContext(new Map([['a', obj]]));
    const listener = vi.fn();
    context.subscribe(listener);

    context.setState([['a', { x: 1 }]]);

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
});
