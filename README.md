# json-reflex

An expression and state management library for building reactive UIs from pure JSON.

If you have a server-driven UI, json-reflex lets your JSON include small expressions for conditionals, formatting and math. They are evaluated on the client against a shared state, and re-evaluated when that state changes.

```json
{
  "title": { "$expr": "isLoggedIn ? \"Hello \" + nickname + \"!\" : \"Howdy!\"" },
  "description": "Plain old text"
}
```

## Features

- **Pure JSON:** expressions are plain `{ "$expr": "..." }` objects, so they can be sent from a server, stored, or generated. They can be nested at any depth inside objects and arrays.
- **Targeted updates:** each engine tracks which state keys its expressions read, and is only re-evaluated when one of those keys changes.
- **No `eval`:** expressions are parsed into a syntax tree and evaluated by a small interpreter. Only the operators listed below and the functions you provide are available.
- **Standard functions:** optional string and math helpers.
- **React bindings:** a provider and two hooks, with React as an optional peer dependency.
- **TypeScript types:** `ObjectWithExpressions<T>` and `ObjectWithoutExpressions<T>` describe objects before and after evaluation.

## Installation

```bash
npm install json-reflex
```

React is only needed if you use `json-reflex/react`.

The package has three entry points:

| Import from          | Contains                                                         |
| -------------------- | ---------------------------------------------------------------- |
| `json-reflex`        | `StateContext`, `ExpressionEngine` and the TypeScript types      |
| `json-reflex/react`  | `ExpressionStateProvider`, `useExpressionState`, `useExpressionEngine` |
| `json-reflex/std`    | `stdFunctions`, `stringFunctions`, `mathFunctions`               |

## Quick start with React

```tsx
import { ExpressionStateProvider, useExpressionEngine, useExpressionState } from 'json-reflex/react';
import { stdFunctions } from 'json-reflex/std';
import type { ObjectWithExpressions } from 'json-reflex';

const options = { functions: stdFunctions };
const initialState = new Map([['quantity', 1]]);

const App = () => (
  <ExpressionStateProvider options={options} initialState={initialState}>
    <Line label="Items" total={{ $expr: '10 * quantity' }} />
    <Line label="Freight" total={23} />
    <Line label="Total" total={{ $expr: '10 * quantity + 23' }} />
    <Controls />
  </ExpressionStateProvider>
);

const Line = (props: ObjectWithExpressions<{ label: string; total: number }>) => {
  const { evaluated } = useExpressionEngine(props);

  return <p>{evaluated.label}: {evaluated.total}</p>;
};

const Controls = () => {
  const state = useExpressionState();

  return (
    <button onClick={() => state.incrementState(['quantity'], 1)}>
      Increment quantity
    </button>
  );
};
```

## Examples without React

The examples below share these imports and options:

```ts
import { ExpressionEngine, StateContext, type ExpressionEngineOptions } from 'json-reflex';
import { stdFunctions } from 'json-reflex/std';

const options: ExpressionEngineOptions = { functions: stdFunctions };
```

### Evaluating once

```ts
const data = {
  title: { $expr: 'isLoggedIn ? "Hello " + nickname + "!" : "Howdy!"' },
  description: 'Plain old text',
};

const state = new StateContext();
const engine = new ExpressionEngine(state, data, options);

console.log(engine.evaluated);
// { title: 'Howdy!', description: 'Plain old text' }

state.setState([
  ['isLoggedIn', true],
  ['nickname', 'Foobar'],
]);

// Without a subscription, the engine has to be told to re-evaluate
engine.update();

console.log(engine.evaluated);
// { title: 'Hello Foobar!', description: 'Plain old text' }
```

### Subscribing to changes

With `subscribe`, the engine re-evaluates by itself, so you don't need to call `update()`.

```ts
const state = new StateContext(new Map([['nickname', 'Foobar']]));
const engine = new ExpressionEngine(state, data, options);

engine.subscribe((evaluated) => {
  console.log(evaluated);
});

state.setState([['isLoggedIn', false]]);
state.setState([['isLoggedIn', true]]);
state.setState([['nickname', 'Bar']]);

// { title: 'Howdy!', description: 'Plain old text' }
// { title: 'Hello Foobar!', description: 'Plain old text' }
// { title: 'Hello Bar!', description: 'Plain old text' }
```

The callback receives the same object as `engine.evaluated`, updated in place.

### One engine per component

Several engines can share one state. Each one is only notified when a key it depends on changes.

```ts
const header = { title: { $expr: 'isLoggedIn ? "Logged in" : "Logged out"' } };
const profile = { username: { $expr: 'isLoggedIn ? nickname : "Anonymous"' } };

const state = new StateContext();
const headerEngine = new ExpressionEngine(state, header, options);
const profileEngine = new ExpressionEngine(state, profile, options);

headerEngine.subscribe((evaluated) => console.log('Header:', evaluated));
profileEngine.subscribe((evaluated) => console.log('Profile:', evaluated));

state.setState([
  ['isLoggedIn', true],
  ['nickname', 'Foo'],
]);
// Header: { title: 'Logged in' }
// Profile: { username: 'Foo' }

state.setState([['nickname', 'Bar']]);
// Profile: { username: 'Bar' }

// The header engine isn't notified, because it only depends on "isLoggedIn"
```

### Custom functions

Expressions can only call the functions in `options.functions`. Add your own next to the standard ones:

```ts
const options: ExpressionEngineOptions = {
  functions: new Map([
    ...stdFunctions,
    ['formatPrice', (value: number) => `$${value.toFixed(2)}`],
  ]),
};

const data = { price: { $expr: 'formatPrice(quantity * 4.5)' } };

const state = new StateContext(new Map([['quantity', 3]]));
const engine = new ExpressionEngine(state, data, options);

console.log(engine.evaluated);
// { price: '$13.50' }
```

## Expression syntax

Expressions use a small, JavaScript-like syntax. Identifiers are read from the state.

| Supported              | Examples                                       |
| ---------------------- | ---------------------------------------------- |
| Literals               | `1`, `2.5`, `"text"`, `'text'`, `true`, `null` |
| Arithmetic             | `+`, `-`, `*`, `/`, `%`                        |
| Comparison             | `==`, `!=`, `===`, `!==`, `<`, `<=`, `>`, `>=` |
| Logical                | `&&`, `\|\|`, `!` (`&&` and `\|\|` short-circuit) |
| Unary                  | `-value`, `+value`                             |
| Conditional            | `isLoggedIn ? "Hi" : "Bye"`                    |
| Function calls         | `toUpperCase(name)`, `max(a, b)`               |

Not supported (these throw an error): property access (`user.name`), array and object literals, method calls (`name.trim()`), and `??`.

A state key that isn't set reads as `undefined`. Calling a function that isn't in `options.functions` throws `Function not found`.

## Standard functions

Import them from `json-reflex/std`. `stdFunctions` contains both groups.

- **`stringFunctions`:** `length`, `toUpperCase`, `toLowerCase`, `substring`, `concat`, `trim`, `replace`, `includes`, `startsWith`, `endsWith`, `indexOf`, `lastIndexOf`, `padStart`, `padEnd`, `repeat`. They take the string as the first argument, for example `padStart(code, 4, "0")`, and treat `null` and `undefined` as an empty string.
- **`mathFunctions`:** `max`, `min`, `abs`, `round`, `floor`, `ceil`, `sqrt`, `pow`, `log`, `exp`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`. These are the matching `Math` functions.

## API

### `StateContext`

Holds the state shared by every engine, as a `Map` of keys to primitive values.

| Method                            | Description |
| --------------------------------- | ----------- |
| `new StateContext(initialState?)` | Creates a state from a `Map`. The map is used as-is, not copied. |
| `getState()`                      | Returns the state `Map`. |
| `setState(entries)`               | Sets `[key, value]` pairs and notifies listeners. Only values that differ (`!==`) are reported as changed. |
| `toggleState(keys)`               | Negates each key's value by truthiness. Missing keys become `true`. |
| `incrementState(keys, amount)`    | Adds `amount` to each key. Use a negative amount to decrement. See below. |
| `subscribe(listener)`             | Calls `listener(state, changedKeys)` after every update. Returns an unsubscribe function. |

`incrementState` converts values before adding to them:

- Numbers, booleans and numeric strings become numbers. Non-numeric strings become `NaN`.
- BigInts stay BigInts, so `amount` must be an integer.
- `null`, `undefined`, RegExp values and missing keys are set to `amount`.

### `ExpressionEngine`

Evaluates the expressions in an object against a `StateContext`.

| Member                                    | Description |
| ----------------------------------------- | ----------- |
| `new ExpressionEngine(state, object, options)` | Evaluates `object` right away. The original object is not modified. |
| `evaluated`                               | The object with every expression replaced by its value. |
| `subscribe(callback)`                     | Re-evaluates and calls `callback(evaluated)` when a key the expressions depend on changes. Returns an unsubscribe function. |
| `update()`                                | Re-evaluates every expression. Only needed when you don't use `subscribe`. |

### React

- **`<ExpressionStateProvider initialState? options?>`** creates a `StateContext` for its children. It only reads `initialState` and `options` on the first render; update the state through `useExpressionState` instead.
- **`useExpressionState()`** returns the provider's `StateContext`. It doesn't re-render the component when the state changes.
- **`useExpressionEngine(object, options?)`** returns `{ state, evaluated }` and re-renders when the result changes. `options` defaults to the provider's options. A new engine is built whenever `object` or `options` changes by reference, so keep them stable (for example with `useMemo`) when you can.

Both hooks throw if they are used outside an `ExpressionStateProvider`.

## Samples

The `samples` folder has three runnable examples:

```bash
npm run sample:react
```

```bash
npm run sample:react-sdui
```

```bash
npm run sample:vanilla-sdui
```

- **`react`:** the hooks used directly in components.
- **`react-sdui`:** a server-driven UI rendered with React from JSON data.
- **`vanilla-sdui`:** the same idea without React.
