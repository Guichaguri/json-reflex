import { StateContext } from './context.js';
import { ExpressionError } from './errors.js';
import { deepClone, type PathTree, setFromPath, walkThroughObject } from './utils.js';
import type {
  ExpressionEngineOptions,
  ObjectWithExpressions,
  ObjectWithoutExpressions,
} from './types.js';
import { buildExpression, type EvaluateExpression } from './builder.js';

interface ExpressionRef {
  path: string[];
  key: string;
  expression: string;
  evaluate: EvaluateExpression;
}

/**
 * Responsible for evaluating expressions within an object based on the current state context.
 * It tracks dependencies and updates the evaluated object when relevant state changes occur.
 */
export class ExpressionEngine<T extends ObjectWithExpressions<T>> {
  // Nodes have no prototype, so keys like `__proto__` or `constructor` from the data can't reach Object.prototype
  private readonly skipTree: PathTree = Object.create(null);
  private readonly expressions: ExpressionRef[] = [];
  private readonly dependencies: Set<string> = new Set<string>();

  private evaluatedObject: ObjectWithoutExpressions<T>;

  /**
   * Creates a new expression engine.
   *
   * @param context The state
   * @param raw The object to search for expressions. It must be JSON-serializable
   * @param options The engine options
   * @throws {ExpressionError} If an expression fails to parse or evaluate and `options.onError` is not set.
   * If several fail, they are thrown together in an `AggregateError`.
   */
  constructor(
    private readonly context: StateContext,
    raw: T,
    private readonly options: ExpressionEngineOptions,
  ) {
    this.evaluatedObject = this.deepClone(raw) as ObjectWithoutExpressions<T>;
    const errors: ExpressionError[] = [];

    walkThroughObject(raw, (path, key, value) => {
      if (!value || typeof value !== 'object' || !Object.hasOwn(value, '$expr')) {
        return;
      }

      const expression = value.$expr;

      try {
        if (typeof expression !== 'string') {
          throw new Error(`"$expr" must be a string, but got ${expression === null ? 'null' : typeof expression}`);
        }

        const evaluate = buildExpression(expression, this.dependencies, this.options);
        this.expressions.push({ path, key, expression, evaluate });
      } catch (error) {
        errors.push(new ExpressionError(String(expression), [...path, key], 'parse', error));
        setFromPath(this.evaluatedObject, path, key, undefined);
      }
    }, (path, key, value) => {
      if (this.options.shouldSkip?.(path, key, value)) {
        let obj = this.skipTree;

        for (const part of path) {
          obj = (obj[part] ??= Object.create(null)) as PathTree;
        }

        obj[key] = true;
        return true;
      }

      return false;
    }, []);

    // Initial values
    errors.push(...this.evaluate(context.getState()));
    this.reportErrors(errors);
  }

  /**
   * Gets the last evaluated object with all expressions resolved based on the current state context.
   */
  get evaluated(): ObjectWithoutExpressions<T> {
    return this.evaluatedObject;
  }

  /**
   * Subscribes to changes in the evaluated object.
   *
   * When an expression fails, `onChanged` is still called with the other expressions updated.
   * Errors are only reported through `options.onError`: the state update that caused them doesn't throw.
   *
   * @param onChanged - The callback to be called when the evaluated object changes.
   * @returns A function to unsubscribe from the changes.
   */
  public subscribe(onChanged: (evaluated: ObjectWithoutExpressions<T>) => void): () => void {
    return this.context.subscribe((state: Map<string, any>, changedProperties: string[]) => {
      if (!changedProperties.some(prop => this.dependencies.has(prop))) {
        return;
      }

      if (!this.options.disableCloneOnUpdate) {
        this.evaluatedObject = this.deepClone(this.evaluatedObject);
      }

      const errors = this.evaluate(state);
      onChanged(this.evaluatedObject);
      this.reportErrors(errors);
    });
  }

  /**
   * Updates the evaluated object based on the current state context.
   * This method can be called to force a re-evaluation of all expressions.
   * It is useful when the state context has changed outside the subscription mechanism.
   *
   * You don't need to call this method if you are using the subscribe method,
   * as it will automatically update the evaluated object when relevant state changes occur.
   *
   * @throws {ExpressionError} If an expression fails and `options.onError` is not set.
   */
  public update(): void {
    if (!this.options.disableCloneOnUpdate) {
      this.evaluatedObject = this.deepClone(this.evaluatedObject);
    }

    this.reportErrors(this.evaluate(this.context.getState()));
  }

  /**
   * Updates the evaluated object based on the passed state.
   * A failing expression is set to `undefined` and does not stop the others from being evaluated.
   *
   * @param state The state map
   * @returns The errors thrown by the failing expressions
   */
  private evaluate(state: Map<string, any>): ExpressionError[] {
    const errors: ExpressionError[] = [];

    for (const ref of this.expressions) {
      let newValue: unknown;

      try {
        newValue = ref.evaluate(state);
      } catch (error) {
        errors.push(new ExpressionError(ref.expression, [...ref.path, ref.key], 'evaluate', error));
        newValue = undefined;
      }

      setFromPath(this.evaluatedObject, ref.path, ref.key, newValue);
    }

    return errors;
  }

  /**
   * Passes the errors to `options.onError`, or throws them when it is not set.
   * @param errors The errors to report
   */
  private reportErrors(errors: ExpressionError[]): void {
    if (errors.length === 0) {
      return;
    }

    const onError = this.options.onError;

    if (onError) {
      errors.forEach(error => onError(error));
    } else if (errors.length === 1) {
      throw errors[0];
    } else {
      throw new AggregateError(errors, `${errors.length} expressions failed:\n${errors.map(e => e.message).join('\n')}`);
    }
  }

  /**
   * Deep clones the object
   * @param object The base object
   * @returns A clone of the base object
   */
  private deepClone<T>(object: T): T {
    if (this.options.deepClone === false) {
      return object;
    }

    if (this.options.deepClone) {
      return this.options.deepClone(object);
    }

    return deepClone(object, this.skipTree);
  }

}
