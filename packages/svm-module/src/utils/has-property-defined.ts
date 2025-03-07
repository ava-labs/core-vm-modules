export function hasPropertyDefined<T, K extends keyof T>(key: K) {
  return (thing: T): thing is T & Record<K, NonNullable<unknown>> => Boolean(thing[key]);
}
