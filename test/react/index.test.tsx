// @vitest-environment happy-dom
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StateContext } from '../../src/core/context.js';
import type { ExpressionOrValue, ExpressionEngineOptions } from '../../src/core/types.js';
import { ExpressionStateProvider, useExpressionEngine, useExpressionState } from '../../src/react/index.js';

afterEach(cleanup);

function wrapper(initialState?: Map<string, any>, options?: ExpressionEngineOptions) {
  return ({ children }: { children: ReactNode }) => (
    <ExpressionStateProvider
      {...(initialState ? { initialState } : {})}
      {...(options ? { options } : {})}
    >
      {children}
    </ExpressionStateProvider>
  );
}

describe('ExpressionStateProvider', () => {
  it('renders its children', () => {
    render(<ExpressionStateProvider><p>child</p></ExpressionStateProvider>);

    expect(screen.getByText('child')).toBeTruthy();
  });

  it('keeps the same state across re-renders', () => {
    const { result, rerender } = renderHook(() => useExpressionState(), { wrapper: wrapper() });
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });
});

describe('useExpressionState', () => {
  it('returns the state context with the initial state', () => {
    const initialState = new Map([['a', 1]]);
    const { result } = renderHook(() => useExpressionState(), { wrapper: wrapper(initialState) });

    expect(result.current).toBeInstanceOf(StateContext);
    expect(result.current.getState()).toBe(initialState);
  });

  it('throws outside of a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useExpressionState()))
      .toThrow('useExpressionState must be used within an ExpressionStateProvider');

    vi.restoreAllMocks();
  });
});

describe('useExpressionEngine', () => {
  it('evaluates the object with the initial state', () => {
    const { result } = renderHook(
      () => useExpressionEngine({ title: { $expr: '"Hi " + name' }, plain: 1 }),
      { wrapper: wrapper(new Map([['name', 'John']])) },
    );

    expect(result.current.evaluated).toEqual({ title: 'Hi John', plain: 1 });
    expect(result.current.state).toBeInstanceOf(StateContext);
  });

  it('re-renders when a dependency changes', () => {
    const { result } = renderHook(
      () => useExpressionEngine({ value: { $expr: 'a * 2' } }),
      { wrapper: wrapper(new Map([['a', 1]])) },
    );

    act(() => result.current.state.setState([['a', 4]]));

    expect(result.current.evaluated).toEqual({ value: 8 });
  });

  it('re-evaluates immediately when the object changes', () => {
    const { result, rerender } = renderHook(
      ({ object }) => useExpressionEngine(object),
      {
        wrapper: wrapper(new Map([['a', 3]])),
        initialProps: { object: { value: { $expr: 'a * 2' } } },
      },
    );

    expect(result.current.evaluated).toEqual({ value: 6 });

    rerender({ object: { value: { $expr: 'a + 1' } } });

    expect(result.current.evaluated).toEqual({ value: 4 });
  });

  it('keeps tracking changes after the object changes', () => {
    const { result, rerender } = renderHook(
      ({ object }) => useExpressionEngine(object),
      {
        wrapper: wrapper(new Map([['a', 1], ['b', 1]])),
        initialProps: { object: { value: { $expr: 'a' } } },
      },
    );

    rerender({ object: { value: { $expr: 'b' } } });
    act(() => result.current.state.setState([['b', 5]]));

    expect(result.current.evaluated).toEqual({ value: 5 });
  });

  it('returns the same result across re-renders when nothing changed', () => {
    const object = { value: { $expr: 'a' } };
    const { result, rerender } = renderHook(
      () => useExpressionEngine(object),
      { wrapper: wrapper(new Map([['a', 1]])) },
    );
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it('uses the functions from the provider options', () => {
    const options = { functions: new Map([['upper', (s: string) => s.toUpperCase()]]) };
    const { result } = renderHook(
      () => useExpressionEngine({ value: { $expr: 'upper(name)' } }),
      { wrapper: wrapper(new Map([['name', 'john']]), options) },
    );

    expect(result.current.evaluated).toEqual({ value: 'JOHN' });
  });

  it('prefers the options passed to the hook', () => {
    const providerOptions = { functions: new Map([['fn', () => 'provider']]) };
    const hookOptions = { functions: new Map([['fn', () => 'hook']]) };
    const { result } = renderHook(
      () => useExpressionEngine({ value: { $expr: 'fn()' } }, hookOptions),
      { wrapper: wrapper(undefined, providerOptions) },
    );

    expect(result.current.evaluated).toEqual({ value: 'hook' });
  });

  it('throws outside of a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useExpressionEngine({ value: 1 })))
      .toThrow('useExpressionEngine must be used within an ExpressionStateProvider');

    vi.restoreAllMocks();
  });

  it('updates rendered components when the shared state changes', () => {
    const Article = (props: { title: ExpressionOrValue<string> }) => {
      const { evaluated } = useExpressionEngine(props);
      return <h2>{evaluated.title}</h2>;
    };
    let state!: StateContext;
    const Capture = () => {
      state = useExpressionState();
      return null;
    };

    render(
      <ExpressionStateProvider initialState={new Map([['show', false]])}>
        <Article title={{ $expr: 'show ? "Visible" : "Hidden"' }} />
        <Article title="Static" />
        <Capture />
      </ExpressionStateProvider>,
    );

    expect(screen.getByText('Hidden')).toBeTruthy();
    expect(screen.getByText('Static')).toBeTruthy();

    act(() => state.setState([['show', true]]));

    expect(screen.getByText('Visible')).toBeTruthy();
    expect(screen.queryByText('Hidden')).toBeNull();
  });
});
