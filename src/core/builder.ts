import jsep from 'jsep';
import { evaluateNode, extractDependencies } from './evaluator.js';
import type { ExpressionEngineOptions } from './types.js';

export type EvaluateExpression = (context: Map<string, any>) => any;

/**
 * Parses and compiles an expression.
 *
 * @param expression The expression string
 * @param dependencies The dependency set. The variables present in this expression will be added to this set.
 * @param options The options for evaluation
 */
export function buildExpression(
  expression: string,
  dependencies: Set<string>,
  options: ExpressionEngineOptions,
): EvaluateExpression {
  const ast = jsep(expression);

  extractDependencies(ast, dependencies);

  return (context: Map<string, any>) => evaluateNode(ast, context, options);
}
