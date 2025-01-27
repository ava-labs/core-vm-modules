import {
  type GetBalancesParams,
  type GetBalancesResponse,
  type NetworkTokenWithBalance,
  TokenType,
} from '@avalabs/vm-module-types';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { getProvider } from '../utils/get-provider';

export const hvmGetBalances = async (params: GetBalancesParams): Promise<GetBalancesResponse> => {
  const { addresses, network } = params;

  const provider = getProvider(network);

  const requests = addresses.map(async (address) => {
    try {
      const balanceResult = await provider.getBalance(address);
      const networkToken = network.networkToken;
      const totalBalance = new TokenUnit(balanceResult, networkToken.decimals, networkToken.symbol);

      const returnBalance: NetworkTokenWithBalance = {
        ...networkToken,
        coingeckoId: '',
        type: TokenType.NATIVE,
        balance: balanceResult,
        balanceDisplayValue: totalBalance.toDisplay(),
      };

      return { [address]: { [networkToken.symbol]: returnBalance } };
    } catch (err) {
      return { [address]: { error: (err as Error).toString() } };
    }
  });

  return (await Promise.allSettled(requests)).reduce((acc, curr) => {
    return {
      ...acc,
      ...(curr.status === 'fulfilled' ? curr.value : curr.reason),
    };
  }, {} as GetBalancesResponse);
};
