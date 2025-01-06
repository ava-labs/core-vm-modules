import { type HvmGetBalanceParams, TokenType } from '@avalabs/vm-module-types';
import { TokenUnit } from '@avalabs/core-utils-sdk';

export const hvmGetBalances = async (params: HvmGetBalanceParams) => {
  const { sdkClient, addresses, currency, network } = params;
  if (!addresses[0]) {
    throw new Error('no address');
  }
  const balanceResult = await sdkClient.getBalance(addresses[0]);

  const lowercaseCurrency = currency.toLowerCase();
  // eslint-disable-next-line no-console
  console.log('lowercaseCurrency: ', lowercaseCurrency);
  const address = addresses[0] ?? '';
  const networkToken = network.networkToken;
  const totalBalance = new TokenUnit(balanceResult, networkToken.decimals, networkToken.symbol);

  const priceInCurrency = 0;
  const balanceInCurrency = totalBalance.mul(priceInCurrency);
  const returnBalance = {
    ...networkToken,
    type: TokenType.NATIVE,
    balance: balanceResult,
    balanceInCurrency: balanceInCurrency.toDisplay({ fixedDp: 2, asNumber: true }),
    balanceDisplayValue: totalBalance.toDisplay(),
    balanceCurrencyDisplayValue: balanceInCurrency?.toDisplay({ fixedDp: 2 }),
  };
  return { [address]: { [networkToken.symbol]: returnBalance } };
};
