/**
 * Walk through all properties of an object, including nested objects, and apply a callback function to each property.
 * The callback receives the path to the property, the key of the property, and the value of the property.
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
 * @param obj The object in which to set the value.
 * @param path An array of strings representing the path to the property where the value should be set.
 * @param key The key of the property to set at the end of the path.
 * @param value The value to set at the specified path and key.
 */
export function setFromPath(obj: any, path: string[], key: string, value: any): void {
  let current = obj;

  for (const segment of path) {
    if (!(segment in current)) {
      current[segment] = {};
    }
    current = current[segment];
  }

  current[key] = value;
}
