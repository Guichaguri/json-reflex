import { StateContext } from './context.js';
import { setFromPath, walkThroughObject } from './utils.js';
import type {
  ExpressionEngineOptions,
  ObjectWithExpressions,
  ObjectWithoutExpressions,
} from './types.js';
import { buildExpression, type EvaluateExpression } from './builder.js';

interface ExpressionRef {
  path: string[];
  key: string;
  evaluate: EvaluateExpression;
}

/**
 * Responsible for evaluating expressions within an object based on the current state context.
 * It tracks dependencies and updates the evaluated object when relevant state changes occur.
 */
export class ExpressionEngine<T extends ObjectWithExpressions<T>> {
  private expressions: ExpressionRef[] = [];
  private dependencies: Set<string> = new Set<string>();
  private evaluatedObject: ObjectWithoutExpressions<T>;

  constructor(
    private readonly context: StateContext,
    raw: T,
    private readonly options: ExpressionEngineOptions,
  ) {
    this.evaluatedObject = structuredClone(raw) as ObjectWithoutExpressions<T>;
    const initialState = context.getState();

    walkThroughObject(raw, (path, key, value) => {
      if (value && typeof value === 'object' && '$expr' in value) {
        const evaluate = buildExpression(value.$expr, this.dependencies, this.options);

        this.expressions.push({
          path,
          key,
          evaluate,
        });

        // Initial value
        setFromPath(this.evaluatedObject, path, key, evaluate(initialState));
      }
    });
  }

  /**
   * Gets the last evaluated object with all expressions resolved based on the current state context.
   */
  get evaluated(): ObjectWithoutExpressions<T> {
    return this.evaluatedObject;
  }

  /**
   * Subscribes to changes in the evaluated object.
   * @param onChanged - The callback to be called when the evaluated object changes.
   * @returns A function to unsubscribe from the changes.
   */
  public subscribe(onChanged: (evaluated: ObjectWithoutExpressions<T>) => void): () => void {
    return this.context.subscribe((state: Map<string, any>, changedProperties: string[]) => {
      if (changedProperties.some(prop => this.dependencies.has(prop))) {
        this.evaluate(state);
        onChanged(this.evaluatedObject);
      }
    });
  }

  /**
   * Updates the evaluated object based on the current state context.
   * This method can be called to force a re-evaluation of all expressions.
   * It is useful when the state context has changed outside the subscription mechanism.
   *
   * You don't need to call this method if you are using the subscribe method,
   * as it will automatically update the evaluated object when relevant state changes occur.
   */
  public update(): void {
    this.evaluate(this.context.getState());
  }

  /**
   * Updates the evaluated object based on the passed state.
   * @param state The state map
   */
  private evaluate(state: Map<string, any>): void {
    this.expressions.forEach(ref => {
      const newValue = ref.evaluate(state);
      setFromPath(this.evaluatedObject, ref.path, ref.key, newValue);
    });
  }

}
