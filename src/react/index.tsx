import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { StateContext } from '../core/context.js';
import { ExpressionEngine } from '../core/engine.js';
import type { ExpressionProcessorOptions, ObjectWithExpressions, ObjectWithoutExpressions } from '../core/types.js';

interface ExpressionStateContextData {
  state?: StateContext;
  options: ExpressionProcessorOptions;
}

const ExpressionStateContext = createContext<ExpressionStateContextData>({
  options: { functions: new Map() },
});

export interface ExpressionStateProviderProps {
  initialState?: Map<string, any>;
  options?: ExpressionProcessorOptions;
  children: ReactNode;
}

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

export function useExpressionState(): StateContext {
  const { state } = useContext(ExpressionStateContext);

  if (!state) {
    throw new Error('useExpressionState must be used within an ExpressionStateProvider');
  }

  return state;
}

export interface UseExpressionEngineResult<T extends ObjectWithExpressions<any>> {
  state: StateContext;
  evaluated: ObjectWithoutExpressions<T>;
}

export function useExpressionEngine<T extends ObjectWithExpressions<any>>(
  object: T,
  options?: ExpressionProcessorOptions,
): UseExpressionEngineResult<T> {
  const context = useContext(ExpressionStateContext);
  const processor = useMemo(() => {
    if (!context.state) {
      throw new Error('useExpressionEngine must be used within an ExpressionStateProvider');
    }
    return new ExpressionEngine(context.state, object, options ?? context.options);
  }, [context, options]);

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
