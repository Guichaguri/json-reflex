import type { Primitive } from './types.js';

export type StateContextListener = (state: Map<string, Primitive>, changedProperties: string[]) => void;

/**
 * Manages the state for expression evaluation and notifies listeners when the state changes.
 */
export class StateContext {
  private readonly state: Map<string, Primitive>;
  private listeners: StateContextListener[] = [];

  /**
   * Creates a new state context.
   *
   * @param initialState The initial state. The map is used as-is (not copied), so later updates mutate it.
   */
  constructor(initialState: Map<string, Primitive> = new Map()) {
    this.state = initialState;
  }

  /**
   * Gets the current state.
   *
   * @returns The live state map. It is the same instance across calls and is mutated by state updates.
   */
  getState(): Map<string, Primitive> {
    return this.state;
  }

  /**
   * Updates the state with the given entries and notifies every listener.
   *
   * Only entries whose value differs from the current one (compared with `!==`) are applied and
   * reported as changed. Listeners are always notified, even when no property changed.
   *
   * @param entries The key-value pairs to set.
   */
  setState(entries: [string, any][]): void {
    const changedProperties: string[] = [];

    entries.forEach(([key, value]) => {
      if (this.state.get(key) !== value) {
        this.state.set(key, value);
        changedProperties.push(key);
      }
    });

    this.listeners.forEach((listener) => listener(this.state, changedProperties));
  }

  /**
   * Toggles the boolean value of each given key.
   *
   * Each value is negated using JavaScript truthiness, so missing or falsy values become `true`
   * and truthy values become `false`. Listeners are notified once for all keys.
   *
   * @param keys The keys to toggle.
   */
  toggleState(keys: string[]): void {
    this.setState(keys.map(key => [key, !this.state.get(key)]));
  }

  /**
   * Increments the numeric value of each given key by the given amount.
   *
   * - Numbers, booleans and strings are converted with `Number()` before being incremented,
   *   so the result is always a number (or `NaN` for non-numeric strings).
   * - BigInts are incremented by `BigInt(amount)`, so `amount` must be an integer.
   * - Any other value (`null`, `undefined`, RegExp) is replaced by `amount`, as if it started at zero.
   *   Missing keys are treated as `undefined`, so they are created with `amount` as their value.
   *
   * Listeners are notified once for all keys.
   *
   * @param keys The keys to increment.
   * @param amount The amount to add. Use a negative value to decrement.
   * @throws {RangeError} If a key holds a BigInt and `amount` is not an integer.
   */
  incrementState(keys: string[], amount: number): void {
    this.setState(keys.map(key => {
      let value = this.state.get(key);

      switch (typeof value) {
        case 'number':
        case 'boolean':
        case 'string':
          return [key, Number(value) + amount];
        case 'bigint':
          return [key, value + BigInt(amount)];
        default:
          return [key, amount];
      }
    }));
  }

  /**
   * Subscribes a listener to state changes.
   *
   * @param callback The listener called with the state and the changed keys after every update.
   * @returns A function that unsubscribes the listener.
   */
  subscribe(callback: StateContextListener): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }
}
