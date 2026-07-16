import { TokenType, type HypercoreSpotToken } from '@avalabs/vm-module-types';
import type { SpotMetaResponse } from './schemas';

const isValidEvmAddress = (address: string) => /^0x[a-fA-F0-9]{40}$/.test(address);

/**
 * Maps `spotMeta` tokens to the registry used when resolving spot balances.
 * Keeps every spot token (including HyperCore-only ones without an EVM contract).
 */
export const toHypercoreSpotTokens = (tokens: SpotMetaResponse['tokens']): HypercoreSpotToken[] =>
  tokens.map((token) => {
    const address = token.evmContract?.address.toLowerCase();

    return {
      type: TokenType.HYPERCORE_SPOT,
      index: token.index,
      name: token.fullName ?? token.name,
      symbol: token.name,
      decimals: token.weiDecimals,
      evmContract: address && isValidEvmAddress(address) ? address : undefined,
    };
  });
