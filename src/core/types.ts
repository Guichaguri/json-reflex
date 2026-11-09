import type { ExpressionError } from './errors.js';

/**
 * Represents an expression that can be evaluated to produce a value.
 * This interface is used to define objects that contain expressions, allowing for dynamic evaluation of values based on the current state context.
 * The `$expr` property holds the expression string that will be evaluated.
 */
export interface Expression { $expr: string }

/**
 * Represents a value that can either be a plain value of type T or an expression that evaluates to a value of type T.
 * This type is used to allow flexibility in defining values that can be either static or dynamic based on the evaluation of an expression.
 *
 * @template T - The type of the value that the expression evaluates to.
 */
export type ExpressionOrValue<T> = T | Expression;

/**
 * Represents a primitive value in TypeScript, which includes string, number, bigint, boolean, regex, null, and undefined.
 * This type is used to define values that are considered primitive and can be used in expressions or as plain values.
 */
export type Primitive = string | number | bigint | boolean | RegExp | null | undefined;

/**
 * Represents a function that can be used in expressions to perform operations or calculations.
 * The function can take any number of arguments and return any type of value.
 * This type is used to define functions that can be registered in the expression processor options for use in expressions.
 */
export type ExpressionFunction = (...args: any[]) => any;

/**
 * Represents a mapping of function names to their corresponding expression functions.
 */
export type ExpressionFunctions = Map<string, ExpressionFunction>;

/**
 * Options for the expression engine.
 */
export interface ExpressionEngineOptions {
  /**
   * The functions available in expressions
   */
  functions?: ExpressionFunctions;

  /**
   * The engine will clone the object before mutating it.
   * This allows providing a custom deep clone function implementation.
   * Set this to `false` to mutate the original object, without deep cloning it.
   */
  deepClone?: (<T>(object: T) => T) | false;

  /**
   * Whether it should not deep clone on updates
   */
  disableCloneOnUpdate?: boolean;

  /**
   * Called when an expression fails to parse or evaluate. The failed expression's value becomes `undefined`.
   *
   * When omitted, the error is thrown instead, after every other expression in the engine has been updated.
   */
  onError?: (error: ExpressionError) => void;
}

/**
 * Validates that every value of T, at any depth (objects and arrays), is either a plain value or an expression.
 * Mapped over keyof T so it also accepts interfaces, which have no implicit index signature.
 */
export type ObjectWithExpressions<T> = { [K in keyof T]: ValueWithExpressions<T[K]> };

type ValueWithExpressions<V> =
  V extends Primitive | Expression ? V
    : V extends { $expr: unknown } ? Expression
      : V extends (...args: any[]) => any ? never
        : V extends object ? ObjectWithExpressions<V>
          : V;

/**
 * Replaces every ExpressionOrValue<X> in T, at any depth, with X.
 * A bare Expression (with no value type in the union) becomes unknown.
 */
export type ObjectWithoutExpressions<T> =
  [Exclude<T, Expression>] extends [never] ? unknown : StripExpressions<Exclude<T, Expression>>;

type StripExpressions<T> =
  T extends Primitive | ((...args: any[]) => any) ? T
    : T extends object ? { [K in keyof T]: ObjectWithoutExpressions<T[K]> }
      : T;

/**
 * Replaces every primitive X in T, at any depth (objects and arrays), with ExpressionOrValue<X>.
 * The inverse of ObjectWithoutExpressions.
 */
export type AllowExpressions<T> =
  T extends Primitive ? ExpressionOrValue<T>
    : T extends (...args: any[]) => any ? T
      : T extends object ? { [K in keyof T]: AllowExpressions<T[K]> }
        : T;
