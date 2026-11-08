/**
 * The step in which an expression failed.
 *
 * - `parse`: the expression could not be parsed, or uses syntax that is not supported.
 * - `evaluate`: the expression was parsed, but threw while being evaluated (for example, an unknown function).
 */
export type ExpressionErrorPhase = 'parse' | 'evaluate';

/**
 * Thrown (or passed to `options.onError`) when an expression fails to parse or evaluate.
 * The original error is available as `cause`.
 */
export class ExpressionError extends Error {
  override readonly name = 'ExpressionError';

  /**
   * @param expression The expression source, as written in `$expr`.
   * @param path The path to the property holding the expression, for example `['items', '0', 'title']`.
   * @param phase The step in which the expression failed.
   * @param cause The original error.
   */
  constructor(
    readonly expression: string,
    readonly path: string[],
    readonly phase: ExpressionErrorPhase,
    cause: unknown,
  ) {
    const location = path.length > 0 ? path.join('.') : '(root)';
    const reason = cause instanceof Error ? cause.message : String(cause);

    super(`Failed to ${phase} expression "${expression}" at "${location}": ${reason}`, { cause });
  }
}
