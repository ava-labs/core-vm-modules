import { z, type ZodSchema } from 'zod';

export async function fetchAndVerify<S extends ZodSchema>(
  fetchOptions: Parameters<typeof fetch>,
  schema: S,
): Promise<z.infer<S>> {
  const response = await fetch(...fetchOptions);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const responseJson = await response.json();
  return schema.parse(responseJson);
}
