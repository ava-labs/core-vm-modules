import type { ZodSchema } from 'zod';
import z from 'zod';

export async function fetchAndVerify<T extends ZodSchema>(
  fetchOptions: Parameters<typeof fetch>,
  schema: T,
  fetchFn: typeof fetch = fetch,
): Promise<z.infer<T>> {
  const response = await fetchFn(...fetchOptions);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const responseJson = await response.json();
  return schema.parse(responseJson);
}
