# json-reflex

[![npm version](https://img.shields.io/npm/v/json-reflex)](https://www.npmjs.com/package/json-reflex)
[![bundle size](https://img.shields.io/bundlephobia/minzip/json-reflex)](https://bundlephobia.com/package/json-reflex)
[![license](https://img.shields.io/npm/l/json-reflex)](./LICENSE)

Reactive expressions and state for UIs built from pure JSON.

Your server-driven JSON can include small expressions for conditionals, formatting and math. They are evaluated on the client against a shared state, and re-evaluated when that state changes.

```json
{
  "title": { "$expr": "isLoggedIn ? \"Hello \" + nickname + \"!\" : \"Howdy!\"" },
  "description": "Plain old text"
}
```

- **Pure JSON:** expressions are `{ "$expr": "..." }` objects, at any depth inside objects and arrays.
- **Shared state, local updates:** when the state changes, only the parts of the UI whose expressions use the changed keys are updated.
- **Custom functions:** extend what expressions can do by registering your own functions, like `formatPrice(total)`, next to the standard string and math ones.
- **Safe:** no `eval`. Expressions run in a small interpreter that can only call the functions you register, everything runs in sandbox.
- **Framework agnostic**, with optional React bindings.

## Installation

```bash
npm install json-reflex
```

| Import from         | Contains |
| ------------------- | -------- |
| `json-reflex`       | `StateContext`, `ExpressionEngine`, `ExpressionError` and the TypeScript types |
| `json-reflex/react` | `ExpressionStateProvider`, `useExpressionState`, `useExpressionEngine` (needs React) |
| `json-reflex/std`   | `stdFunctions`, `stringFunctions`, `mathFunctions` |

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
  return <button onClick={() => state.incrementState(['quantity'], 1)}>Add one</button>;
};
```

## Without React

```ts
import { ExpressionEngine, StateContext } from 'json-reflex';
import { stdFunctions } from 'json-reflex/std';

const state = new StateContext(new Map([['nickname', 'Foo']]));
const engine = new ExpressionEngine(state, {
  title: { $expr: 'isLoggedIn ? "Hello " + nickname + "!" : "Howdy!"' },
}, { functions: stdFunctions });

console.log(engine.evaluated); // { title: 'Howdy!' }

engine.subscribe((evaluated) => console.log(evaluated));

state.setState([['isLoggedIn', true]]); // { title: 'Hello Foo!' }
state.setState([['nickname', 'Bar']]);  // { title: 'Hello Bar!' }
state.setState([['unrelated', 1]]);     // (not called: the title doesn't read "unrelated")
```

Several engines can share one state, for example one per component. Without `subscribe`, call `engine.update()` to re-evaluate.

## Expressions

Expressions use a small, JavaScript-like syntax. Identifiers are read from the state; a key that isn't set is `undefined`.

| Supported      | Examples |
| -------------- | -------- |
| Literals       | `1`, `2.5`, `"text"`, `'text'`, `true`, `null` |
| Arithmetic     | `+`, `-`, `*`, `/`, `%`, unary `-` and `+` |
| Comparison     | `==`, `!=`, `===`, `!==`, `<`, `<=`, `>`, `>=` |
| Logical        | `&&`, `\|\|` (short-circuit), `!` |
| Conditional    | `isLoggedIn ? "Hi" : "Bye"` |
| Function calls | `toUpperCase(name)`, `max(a, b)` |

Not supported: property access (`user.name`), array and object literals, method calls (`name.trim()`) and `??`.

### Functions

Expressions can only call the functions in `options.functions`. The standard ones are in `json-reflex/std`, and `stdFunctions` contains both groups:

- **`stringFunctions`:** `length`, `toUpperCase`, `toLowerCase`, `substring`, `concat`, `trim`, `replace`, `includes`, `startsWith`, `endsWith`, `indexOf`, `lastIndexOf`, `padStart`, `padEnd`, `repeat`. The string is the first argument, as in `padStart(code, 4, "0")`, and `null` or `undefined` count as `""`. `padStart` and `padEnd` cap the length, and `repeat` caps the count, at 10,000.
- **`mathFunctions`:** `max`, `min`, `abs`, `round`, `floor`, `ceil`, `sqrt`, `pow`, `log`, `exp`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, from `Math`.

Add your own next to them:

```ts
const options = {
  functions: new Map([
    ...stdFunctions,
    ['formatPrice', (value: number) => `$${value.toFixed(2)}`],
  ]),
};
// { $expr: 'formatPrice(quantity * 4.5)' } → '$13.50' when quantity is 3
```

## Errors

When an expression fails to parse or evaluate, its value becomes `undefined` and the others still update. The failure is an `ExpressionError` with the `expression`, its `path` (like `['items', '0', 'title']`), the `phase` (`'parse'` or `'evaluate'`) and the original error as `cause`:

```
Failed to evaluate expression "isVip ? badge() : null" at "header.badge": Unknown function "badge". Only functions in options.functions can be called
```

Pass `onError` to report errors, which is usually what you want with server data:

```ts
import type { ExpressionEngineOptions } from 'json-reflex';

const options: ExpressionEngineOptions = {
  functions: stdFunctions,
  onError: (error) => console.warn(error.message),
};
```

Without `onError`, errors are thrown from the `ExpressionEngine` constructor and `update()` (as an `AggregateError` if several fail), and ignored during updates from `setState`.

## TypeScript types

| Type                          | Description |
| ----------------------------- | ----------- |
| `ExpressionOrValue<T>`        | `T` or an expression: `T \| { $expr: string }`. |
| `AllowExpressions<T>`         | `T` with every primitive, at any depth, replaced by `ExpressionOrValue`. Handy for component props. |
| `ObjectWithoutExpressions<T>` | The opposite, and the type of `evaluated`. |
| `ObjectWithExpressions<T>`    | A constraint that checks `T` only holds plain values and expressions. |

```ts
interface ProductProps {
  name: string;
  price: { amount: number; currency: string };
}

const product: AllowExpressions<ProductProps> = {
  name: 'Coffee',
  price: { amount: { $expr: 'isMember ? 4 : 5' }, currency: 'USD' },
};

// ObjectWithoutExpressions<AllowExpressions<T>> is T, so `evaluated` is typed as ProductProps
```

Use `ExpressionOrValue` instead to allow expressions only on specific properties, like `title: ExpressionOrValue<string>`.

## API

### `StateContext`

Holds the shared state, a `Map` of keys to primitive values.

| Member                            | Description |
| --------------------------------- | ----------- |
| `new StateContext(initialState?)` | Uses the given `Map` as-is, without copying it. |
| `getState()`                      | Returns the state `Map`. |
| `setState(entries)`               | Sets `[key, value]` pairs and notifies listeners of the keys that changed (`!==`). Listeners that throw are ignored. |
| `toggleState(keys)`               | Negates each value by truthiness. Missing keys become `true`. |
| `incrementState(keys, amount)`    | Adds `amount` (negative to decrement). Numbers, booleans and numeric strings become numbers, BigInts stay BigInts, and `null`, `undefined` or missing keys start from `amount`. |
| `subscribe(listener)`             | Calls `listener(state, changedKeys)` on changes. Returns an unsubscribe function. |

### `ExpressionEngine`

| Member                                         | Description |
| ---------------------------------------------- | ----------- |
| `new ExpressionEngine(state, object, options)` | Evaluates a copy of `object` right away. |
| `evaluated`                                    | The copy with every expression replaced by its value, updated in place. |
| `subscribe(callback)`                          | Re-evaluates and calls `callback(evaluated)` when a key it depends on changes. Returns an unsubscribe function. |
| `update()`                                     | Re-evaluates every expression. |

| Option      | Description |
| ----------- | ----------- |
| `functions` | A `Map` of the functions expressions can call. |
| `onError`   | Receives each `ExpressionError`. See [Errors](#errors). |
| `deepClone` | How `object` is copied. The default copies JSON data only (objects, arrays, strings, numbers, booleans and `null`), so values like `Date`, `Map` or class instances aren't supported. Pass your own function, or `false` to modify `object` in place. |
| `shouldSkip` | Called as `shouldSkip(path, key, value)` for each property in `object`. Return `true` to leave it alone: it and the expressions under it aren't evaluated, and the default `deepClone` keeps its original value instead of copying it. Useful when each component has its own engine, like `shouldSkip: (path, key) => key === 'children'`, so a parent doesn't evaluate or copy its whole subtree. A custom `deepClone` function doesn't skip anything. |
| `disableCloneOnUpdate` | By default, each update replaces `evaluated` with a new copy, so code that compares by reference (like `React.memo`) sees the change. Set to `true` to update the same object in place, which avoids the copy but keeps the same reference. |

### React

| Export                                         | Description |
| ---------------------------------------------- | ----------- |
| `<ExpressionStateProvider initialState? options?>` | Creates a `StateContext` for its children. Props are only read on the first render. |
| `useExpressionState()`                         | Returns the provider's `StateContext`. Doesn't re-render on changes. |
| `useExpressionEngine(object, options?)`        | Returns `{ state, evaluated }` and re-renders when the result changes. Rebuilds the engine when `object` or `options` changes by reference, so keep them stable. |

Both hooks throw outside an `ExpressionStateProvider`.

## Samples

```bash
npm run sample:react         # hooks used directly in components
npm run sample:react-sdui    # a server-driven UI rendered with React
npm run sample:vanilla-sdui  # the same without React
```
