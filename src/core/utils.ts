/**
 * Defines an own, writable and enumerable property.
 * Unlike an assignment, this never triggers setters such as `__proto__`.
 */
function defineValue(obj: object, key: string, value: unknown): void {
  Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });
}

/**
 * Deep clones JSON data (plain objects, arrays and primitives).
 * Other values, such as class instances, Date, Map or Set, are not supported.
 * The data must not contain circular references.
 *
 * Values at the paths in `skipTree` are not cloned: the clone keeps the original reference.
 * Each path is a branch of nested keys from the root, using indices for arrays, ending in `true`.
 * For instance, `{ component: { 0: { children: true } } }` skips `value.component[0].children`.
 *
 * @param value The JSON value to clone.
 * @param skipTree Paths whose values should be shared with the original instead of cloned.
 * @returns A deep clone of the value.
 */
export function deepClone<T>(value: T, skipTree?: PathTree): T {
  if (typeof value !== 'object' || value === null) return value;

  return cloneObject(value, skipTree);
}

/**
 * A tree of path segments. `true` marks the end of a path.
 * Nodes have no prototype, so keys like `constructor` don't match inherited properties.
 */
export interface PathTree {
  [key: string]: PathTree | true;
}

/**
 * Clones a non-null object or array. Primitives are copied inline instead of
 * recursing into them, saving a function call per leaf value.
 * `tree` is the part of the skip paths under this value, or `undefined` when none go through it.
 */
function cloneObject(value: any, tree: PathTree | undefined): any {
  if (Array.isArray(value)) {
    const out = new Array(value.length);
    for (let i = 0; i < value.length; i++) {
      const v = value[i];
      if (typeof v === 'object' && v !== null) {
        const node = tree && tree[i];
        out[i] = node === true ? v : cloneObject(v, node);
      } else {
        out[i] = v;
      }
    }
    return out;
  }

  const out: Record<string, any> = {};
  for (const key in value) {
    let cloned = value[key];
    if (typeof cloned === 'object' && cloned !== null) {
      const node = tree && tree[key];
      if (node !== true) cloned = cloneObject(cloned, node);
    }
    if (key === '__proto__') {
      defineValue(out, key, cloned);
    } else {
      out[key] = cloned;
    }
  }
  return out;
}

/**
 * Walk through all properties of an object, including nested objects and arrays, and apply a callback function to each property.
 * The callback receives the path to the property, the key of the property, and the value of the property.
 * The object must not contain circular references.
 *
 * @param obj The object to walk through.
 * @param callback A function to call for each property, receiving the path, key, and value.
 * @param shouldSkip A function that checks whether an object should be skipped
 * @param basePath The current path to the property, used for recursion. Defaults to an empty array.
 */
export function walkThroughObject(
  obj: object,
  callback: (path: string[], key: string, value: any) => void,
  shouldSkip: (path: string[], key: string, value: any) => boolean,
  basePath: string[] = [],
): void {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as any)[key];

      if (shouldSkip(basePath, key, value)) {
        continue;
      }

      callback(basePath, key, value);

      if (value && typeof value === 'object') {
        walkThroughObject(value, callback, shouldSkip, [...basePath, key]);
      }
    }
  }
}

/**
 * Sets a value in an object at a specified path, creating nested objects as needed.
 * If the path does not exist, it will be created. The value will be set at the final key in the path.
 *
 * Only own properties are followed and set, so keys such as `__proto__` or `constructor`
 * are treated as ordinary keys and never reach the prototype.
 *
 * @param obj The object in which to set the value.
 * @param path An array of strings representing the path to the property where the value should be set.
 * @param key The key of the property to set at the end of the path.
 * @param value The value to set at the specified path and key.
 */
export function setFromPath(obj: any, path: string[], key: string, value: any): void {
  let current = obj;

  for (const segment of path) {
    if (!Object.hasOwn(current, segment)) {
      defineValue(current, segment, {});
    }
    current = current[segment];
  }

  defineValue(current, key, value);
}
