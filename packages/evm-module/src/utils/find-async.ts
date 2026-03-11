/**
 * Asynchronously searches through an array to find the first element that satisfies the provided async callback function.
 *
 * @param {T[]} array - The array to search through.
 * @param {(item: T) => Promise<boolean>} asyncCallback - An async function that takes an element of the array and returns a Promise resolving to a boolean.
 * @returns {Promise<T | undefined>} - A Promise that resolves to the first element in the array that satisfies the asyncCallback function, or undefined if no such element is found.
 *
 * @example
 * ```ts
 * const array = [1, 2, 3, 4];
 * const asyncCallback = async (num) => {
 *   return new Promise((resolve) => {
 *     setTimeout(() => {
 *       resolve(num % 2 === 0);
 *     }, 100);
 *   });
 * };
 *
 * findAsync(array, asyncCallback).then((result) => {
 *   console.log(result); // Output: 2 (the first even number)
 * });
 * ```
 */
export async function findAsync<T>(array: T[], asyncCallback: (item: T) => Promise<boolean>): Promise<T | undefined> {
  const promises = array.map(async (item, index) => ({
    index,
    result: await asyncCallback(item),
  }));

  const results = await Promise.allSettled(promises);

  const found = results.filter((item) => item.status === 'fulfilled').find((item) => item.value.result);

  return found ? array[found.value.index] : undefined;
}
