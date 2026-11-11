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
 * Properties whose key is in `skip` are not cloned: the clone keeps the original reference.
 * The skip list applies at every depth.
 *
 * @param value The JSON value to clone.
 * @param skip Keys whose values should be shared with the original instead of cloned.
 * @returns A deep clone of the value.
 */
export function deepClone<T>(value: T, skip: readonly string[] = []): T {
  return typeof value === 'object' && value !== null ? cloneObject(value, skip) : value;
}

/**
 * Clones a non-null object or array. Primitives are copied inline instead of
 * recursing into them, saving a function call per leaf value.
 */
function cloneObject(value: any, skip: readonly string[]): any {
  if (Array.isArray(value)) {
    const out = new Array(value.length);
    for (let i = 0; i < value.length; i++) {
      const v = value[i];
      out[i] = typeof v === 'object' && v !== null ? cloneObject(v, skip) : v;
    }
    return out;
  }

  const out: Record<string, any> = {};
  for (const key in value) {
    const v = value[key];
    // Skip lists are tiny, so includes() is faster than a Set
    const cloned = typeof v !== 'object' || v === null || skip.includes(key) ? v : cloneObject(v, skip);
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
 * @param basePath The current path to the property, used for recursion. Defaults to an empty array.
 * @param skipKeys The keys it should skip walking through
 */
export function walkThroughObject(
  obj: object,
  callback: (path: string[], key: string, value: any) => void,
  basePath: string[] = [],
  skipKeys: string[] = [],
): void {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && !skipKeys.includes(key)) {
      const value = (obj as any)[key];
      callback(basePath, key, value);
      if (value && typeof value === 'object') {
        walkThroughObject(value, callback, [...basePath, key], skipKeys);
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
