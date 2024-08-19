type Id = string;
export type IdPromise<T> =
  | { id: string; status: 'fulfilled'; value: T }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { id: string; status: 'rejected'; reason: any };
export type Error = { error: string };

/**
 * The addIdToPromise function takes an existing promise and an id string as input and returns a new promise that
 * resolves to an object containing the id, the status of the original promise (either 'fulfilled' or 'rejected'),
 * and the result or error of the original promise.
 *
 * Usage:
 * This function is useful for tracking the status and outcome of multiple promises when used with Promise.allSettled
 *
 * @param promise The original promise that resolves to a value of type T.
 * @param id A unique identifier associated with the promise.
 */
export function addIdToPromise<T>(promise: Promise<T>, id: string): Promise<IdPromise<T>> {
  return promise
    .then((value) => ({ id, status: 'fulfilled', value }) as IdPromise<T>)
    .catch((reason) => ({ id, status: 'rejected', reason }) as IdPromise<T>);
}

/**
 * The settleAllIdPromises function processes an array of promises that return IdPromise objects,
 * resolving all of them and organizing the results into a record.
 *
 * Usage:
 * Use {@link addIdToPromise} to get array of promises
 *
 * @param promises An array of promises that each resolve to an IdPromise<T> object.
 */
export async function settleAllIdPromises<T>(promises: Promise<IdPromise<T>>[]): Promise<Record<Id, T | Error>> {
  return await Promise.allSettled(promises).then((results) => {
    return results.reduce(
      (acc, result) => {
        if (result.status === 'fulfilled') {
          const value = result.value;
          if (value.status === 'fulfilled') {
            acc[value.id] = value.value;
          } else {
            acc[value.id] = { error: value.reason };
          }
        }
        return acc;
      },
      {} as Record<Id, T | Error>,
    );
  });
}
