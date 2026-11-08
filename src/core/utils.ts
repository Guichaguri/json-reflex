/**
 * Defines an own, writable and enumerable property.
 * Unlike an assignment, this never triggers setters such as `__proto__`.
 */
function defineValue(obj: object, key: string, value: unknown): void {
  Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });
}

/**
 * Walk through all properties of an object, including nested objects and arrays, and apply a callback function to each property.
 * The callback receives the path to the property, the key of the property, and the value of the property.
 * The object must not contain circular references.
 *
 * @param obj The object to walk through.
 * @param callback A function to call for each property, receiving the path, key, and value.
 * @param basePath The current path to the property, used for recursion. Defaults to an empty array.
 */
export function walkThroughObject(
  obj: object,
  callback: (path: string[], key: string, value: any) => void,
  basePath: string[] = []
): void {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as any)[key];
      callback(basePath, key, value);
      if (value && typeof value === 'object') {
        walkThroughObject(value, callback, [...basePath, key]);
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
