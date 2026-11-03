
export type StateContextListener = (state: Map<string, any>, changedProperties: string[]) => void;

/**
 * Manages the state for expression evaluation and notifies listeners when the state changes.
 */
export class StateContext {
  private readonly state: Map<string, any>;
  private listeners: StateContextListener[] = [];

  constructor(initialState: Map<string, any> = new Map()) {
    this.state = initialState;
  }

  getState(): Map<string, any> {
    return this.state;
  }

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

  subscribe(callback: StateContextListener): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }
}
