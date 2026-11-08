import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { StateContext } from '../core/context.js';
import { ExpressionEngine } from '../core/engine.js';
import type { ExpressionEngineOptions, ObjectWithExpressions, ObjectWithoutExpressions } from '../core/types.js';

/**
 * The value shared through the React context by {@link ExpressionStateProvider}.
 */
interface ExpressionStateContextData {
  state?: StateContext;
  options: ExpressionEngineOptions;
}

/**
 * React context holding the shared state and options.
 * Its default value has no state, which lets the hooks detect when they are used outside a provider.
 */
const ExpressionStateContext = createContext<ExpressionStateContextData>({
  options: { functions: new Map() },
});

/**
 * Props for {@link ExpressionStateProvider}.
 */
export interface ExpressionStateProviderProps {
  /** The initial state. Only read on the first render. */
  initialState?: Map<string, any>;
  /** The default options for every engine created below this provider. Only read on the first render. */
  options?: ExpressionEngineOptions;
  children: ReactNode;
}

/**
 * Provides a shared {@link StateContext} and default options to every component below it.
 *
 * The state and options are created once, on the first render. Later changes to the
 * `initialState` or `options` props are ignored; update the state through
 * {@link useExpressionState} instead.
 *
 * @param props - The provider props.
 */
export function ExpressionStateProvider(props: ExpressionStateProviderProps) {
  const [context] = useState<ExpressionStateContextData>(() => {
    return {
      state: new StateContext(props.initialState),
      options: props.options ?? { functions: new Map() },
    };
  });

  return (
    <ExpressionStateContext.Provider value={context}>
      {props.children}
    </ExpressionStateContext.Provider>
  );
}

/**
 * Gets the {@link StateContext} from the nearest {@link ExpressionStateProvider}.
 *
 * Use it to read or update the state, for example with `setState`, `toggleState` or `incrementState`.
 * This hook does not re-render the component when the state changes; use
 * {@link useExpressionEngine} or `StateContext.subscribe` for that.
 *
 * @returns The shared state context.
 * @throws {Error} If called outside an {@link ExpressionStateProvider}.
 */
export function useExpressionState(): StateContext {
  const { state } = useContext(ExpressionStateContext);

  if (!state) {
    throw new Error('useExpressionState must be used within an ExpressionStateProvider');
  }

  return state;
}

/**
 * The value returned by {@link useExpressionEngine}.
 */
export interface UseExpressionEngineResult<T extends ObjectWithExpressions<any>> {
  /** The shared state context from the nearest provider. */
  state: StateContext;
  /** The object with every expression replaced by its evaluated value. */
  evaluated: ObjectWithoutExpressions<T>;
}

/**
 * Evaluates the expressions in an object against the shared state, and re-renders the
 * component whenever a state change affects the result.
 *
 * A new {@link ExpressionEngine} is created whenever `object` or `options` changes by reference,
 * so keep both stable (for example with `useMemo` or a module-level constant) to avoid
 * rebuilding the engine on every render.
 *
 * @param object - The object containing expressions to evaluate.
 * @param options - Options for this engine. Defaults to the provider's options.
 * @returns The state context and the evaluated object.
 * @throws {Error} If called outside an {@link ExpressionStateProvider}.
 */
export function useExpressionEngine<T extends ObjectWithExpressions<any>>(
  object: T,
  options?: ExpressionEngineOptions,
): UseExpressionEngineResult<T> {
  const context = useContext(ExpressionStateContext);
  const processor = useMemo(() => {
    if (!context.state) {
      throw new Error('useExpressionEngine must be used within an ExpressionStateProvider');
    }
    return new ExpressionEngine(context.state, object, options ?? context.options);
  }, [context, object, options]);

  const [evaluated, setEvaluated] = useState<UseExpressionEngineResult<T>>(() => ({
    state: context.state!,
    evaluated: processor.evaluated,
  }));

  useEffect(() => {
    return processor.subscribe((evaluated) => {
      setEvaluated({ state: context.state!, evaluated });
    });
  }, [processor]);

  return evaluated;
}
