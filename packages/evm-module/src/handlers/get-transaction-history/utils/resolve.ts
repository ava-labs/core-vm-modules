export async function resolve<T = unknown>(promise: Promise<T>) {
  try {
    return promise.then((res) => [res, null]).catch((err) => [null, err]);
  } catch (err) {
    return Promise.resolve([null, err]);
  }
}
