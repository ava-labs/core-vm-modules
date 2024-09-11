import type { ZodSchema } from 'zod';

export async function fetchAndVerify(fetchOptions: Parameters<typeof fetch>, schema: ZodSchema) {
  const response = await fetch(...fetchOptions);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const responseJson = response.json();
  return schema.parse(responseJson);
}
