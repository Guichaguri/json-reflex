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
- **Shared state, local updates:** each component tracks which state keys its expressions read, and is only re-evaluated when one of those keys changes.
- **No `eval`:** expressions are parsed into a syntax tree and evaluated by a small interpreter. Only the operators listed below and the functions you provide are available.
- **Custom functions:** expressions can call the functions you provide.
- **Framework agnostic:** pure JS, can be used in any frontend framework
- **React bindings:** ready to use context and hooks for React

## Installation

```bash
npm install json-reflex
```

React is only needed if you use `json-reflex/react`.

The package has three entry points:

| Import from          | Contains                                                         |
| -------------------- | ---------------------------------------------------------------- |
| `json-reflex`        | `StateContext`, `ExpressionEngine`, `ExpressionError` and the TypeScript types |
| `json-reflex/react`  | `ExpressionStateProvider`, `useExpressionState`, `useExpressionEngine` |
| `json-reflex/std`    | `stdFunctions`, `stringFunctions`, `mathFunctions`               |

## Quick start with React

```tsx
import { ExpressionStateProvider, useExpressionEngine, useExpressionState } from 'json-reflex/react';
import { stdFunctions } from 'json-reflex/std';
import type { AllowExpressions } from 'json-reflex';

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

const Line = (props: AllowExpressions<{ label: string; total: number }>) => {
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

A state key that isn't set reads as `undefined`. Calling a function that isn't in `options.functions` fails with `Unknown function "name"`.

## Handling errors

An expression can fail while being parsed (invalid or unsupported syntax) or while being evaluated (for example, an unknown function). A failed expression's value becomes `undefined`, and the other expressions are still evaluated.

Each failure is an `ExpressionError` with the expression, the path to its property and the original error as `cause`:

```
ExpressionError: Failed to evaluate expression "isVip ? badge() : null" at "header.badge": Unknown function "badge". Only functions in options.functions can be called
```

| Property     | Description |
| ------------ | ----------- |
| `expression` | The expression source, as written in `$expr`. |
| `path`       | The path to the property, for example `['items', '0', 'title']`. |
| `phase`      | `'parse'` or `'evaluate'`. |
| `cause`      | The original error. |

By default, the error is thrown from the `ExpressionEngine` constructor or from `update()`. When several expressions fail at once, they are thrown together in an `AggregateError`. Errors during re-evaluations triggered by `setState` are never thrown, so one broken expression doesn't stop the rest of the UI from updating; use `onError` to see them.

With server-driven data, you'll usually want to report errors instead of throwing them. Pass `onError`:

```ts
const options: ExpressionEngineOptions = {
  functions: stdFunctions,
  onError: (error) => console.warn(error.message, error.path),
};
```

## Standard functions

Import them from `json-reflex/std`. `stdFunctions` contains both groups.

- **`stringFunctions`:** `length`, `toUpperCase`, `toLowerCase`, `substring`, `concat`, `trim`, `replace`, `includes`, `startsWith`, `endsWith`, `indexOf`, `lastIndexOf`, `padStart`, `padEnd`, `repeat`. They take the string as the first argument, for example `padStart(code, 4, "0")`, and treat `null` and `undefined` as an empty string.
- **`mathFunctions`:** `max`, `min`, `abs`, `round`, `floor`, `ceil`, `sqrt`, `pow`, `log`, `exp`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`. These are the matching `Math` functions.

`padStart` and `padEnd` cap the target length at 10,000 characters, and `repeat` caps the count at 10,000, so an expression can't allocate huge strings. To allow longer strings, register your own versions of these functions.

## TypeScript types

These types describe your objects before and after evaluation. They are type-only, so they add nothing to your bundle.

| Type                          | Description |
| ----------------------------- | ----------- |
| `Expression`                  | An expression object: `{ $expr: string }`. |
| `ExpressionOrValue<T>`        | A value of type `T`, or an expression that evaluates to one: `T \| Expression`. |
| `AllowExpressions<T>`         | `T` with every primitive, at any depth, replaced by `ExpressionOrValue`. Functions are kept as they are. |
| `ObjectWithoutExpressions<T>` | The opposite: `T` with every `ExpressionOrValue<X>` replaced by `X`. This is the type of `evaluated`. |
| `ObjectWithExpressions<T>`    | A constraint that checks that `T` only holds plain values and expressions. |

Use `ExpressionOrValue` to mark the specific properties that can be expressions:

```ts
import type { ExpressionOrValue, ObjectWithoutExpressions } from 'json-reflex';

interface CardProps {
  title: ExpressionOrValue<string>;
  count: ExpressionOrValue<number>;
  icon: string; // always a plain value
}

type EvaluatedCardProps = ObjectWithoutExpressions<CardProps>;
// { title: string; count: number; icon: string }
```

Use `AllowExpressions` to allow expressions anywhere in an existing type, which is handy for the props of server-driven components:

```ts
import type { AllowExpressions } from 'json-reflex';

interface ProductProps {
  name: string;
  price: { amount: number; currency: string };
  tags: string[];
}

type ProductData = AllowExpressions<ProductProps>;
// {
//   name: ExpressionOrValue<string>;
//   price: { amount: ExpressionOrValue<number>; currency: ExpressionOrValue<string> };
//   tags: ExpressionOrValue<string>[];
// }

const product: ProductData = {
  name: 'Coffee',
  price: { amount: { $expr: 'isMember ? 4 : 5' }, currency: 'USD' },
  tags: ['hot', { $expr: 'isMember ? "member deal" : "regular"' }],
};
```

`ObjectWithoutExpressions<AllowExpressions<T>>` gives back `T`, so `useExpressionEngine(product).evaluated` is typed as `ProductProps`.

## API

### `StateContext`

Holds the state shared by every engine, as a `Map` of keys to primitive values.

| Method                            | Description |
| --------------------------------- | ----------- |
| `new StateContext(initialState?)` | Creates a state from a `Map`. The map is used as-is, not copied. |
| `getState()`                      | Returns the state `Map`. |
| `setState(entries)`               | Sets `[key, value]` pairs and notifies listeners. Only values that differ (`!==`) are reported as changed, and listeners aren't called when nothing changed. If a listener throws, the error is ignored and the others are still called. |
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

The engine options:

| Option      | Description |
| ----------- | ----------- |
| `functions` | A `Map` of the functions expressions can call. |
| `onError`   | Called with an `ExpressionError` when an expression fails. When omitted, errors are thrown. See [Handling errors](#handling-errors). |
| `deepClone` | How `object` is copied before expressions are replaced. By default, it uses `structuredClone`, or `JSON.parse(JSON.stringify(object))` where `structuredClone` isn't available (like React Native). Both only support serializable data: `structuredClone` throws on functions and symbols, and JSON drops them. Pass your own function for other data, or `false` to modify `object` in place. |

Keys such as `__proto__` and `constructor` in the data are treated as ordinary properties, so data from a server can't modify object prototypes.

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
