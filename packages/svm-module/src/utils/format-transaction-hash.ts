import { base58 } from '@scure/base';
import type { Hex } from '@avalabs/vm-module-types';

/**
 * Converts a Solana base58 transaction hash to the hex format required by the approval controller
 * @param base58TxHash The Solana transaction hash in base58 format
 * @returns The transaction hash in 0x-prefixed hex format
 */
export const toHexTxHash = (base58TxHash: string): Hex => {
  return `0x${Buffer.from(base58.decode(base58TxHash)).toString('hex')}` as `0x${string}`;
};

/**
 * Converts a hex transaction hash back to Solana's base58 format
 * @param hexTxHash The transaction hash in 0x-prefixed hex format
 * @returns The Solana transaction hash in base58 format
 */
export const toBase58TxHash = (hexTxHash: Hex): string => {
  return base58.encode(Buffer.from(hexTxHash.slice(2), 'hex'));
};
