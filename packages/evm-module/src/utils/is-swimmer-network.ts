import { ChainId } from '@avalabs/core-chains-sdk';

const swimmerCaipIds = ['eip155:73772', 'eip155:73773'];

export function isSwimmerNetworkByChainAndCaipId(chainId: number, caipId: string) {
  return !!(
    chainId === ChainId.SWIMMER ||
    chainId === ChainId.SWIMMER_TESTNET ||
    swimmerCaipIds.includes(caipId || '')
  );
}
