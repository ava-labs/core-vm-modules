import { base64 } from '@scure/base';
import { getCompiledTransactionMessageDecoder } from '@solana/kit';

export const isTransactionBytes = (base64Payload: string): boolean => {
  try {
    const bytes = base64.decode(base64Payload);
    const decoder = getCompiledTransactionMessageDecoder();
    decoder.decode(bytes);
    return true;
  } catch {
    return false;
  }
};
