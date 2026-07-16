/** CAIP-2 id for HyperCore mainnet. Namespace must be 3–8 chars (CAIP-2).
 * This is a synthetic CAIP-2 for the HyperCore network as HyperCore does not have a chain id.
 */
export const HYPERCORE_CAIP_ID = 'hlcore:mainnet';

/**
 * Synthetic numeric id used by Core network lists / storage keys.
 * Not an EVM chain id — module routing uses {@link HYPERCORE_CAIP_ID}.
 */
export const HYPERCORE_CHAIN_ID = 9999;

export const HYPERCORE_USDC_SYMBOL = 'USDC';
export const HYPERCORE_USDC_NAME = 'USD Coin';
export const HYPERCORE_USDC_DECIMALS = 8;
