import type { CurrencyCode } from '@avalabs/glacier-sdk';
import { TokenType, type NetworkTokenWithBalance } from '@avalabs/vm-module-types';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import type { EvmGlacierService } from '../../../services/glacier-service/glacier-service';

export const getNativeTokenBalances = async ({
  address,
  currency,
  chainId,
  glacierService,
  coingeckoId,
}: {
  chainId: number;
  address: string;
  currency: string;
  coingeckoId: string;
  glacierService: EvmGlacierService;
}): Promise<NetworkTokenWithBalance> => {
  const nativeBalance = await glacierService.getNativeBalance({
    chainId: chainId.toString(),
    address,
    currency: currency.toLocaleLowerCase() as CurrencyCode,
  });
  const nativeTokenBalance = nativeBalance.nativeTokenBalance;
  const balance = new TokenUnit(nativeTokenBalance.balance, nativeTokenBalance.decimals, nativeTokenBalance.symbol);
  const priceInCurrency = nativeTokenBalance.price?.value;
  const balanceInCurrency = priceInCurrency !== undefined ? balance.mul(priceInCurrency) : undefined;

  return {
    name: nativeTokenBalance.name,
    symbol: nativeTokenBalance.symbol,
    decimals: nativeTokenBalance.decimals,
    type: TokenType.NATIVE,
    logoUri: nativeTokenBalance.logoUri,
    balance: balance.toSubUnit(),
    balanceDisplayValue: balance.toDisplay(),
    balanceInCurrency: balanceInCurrency?.toDisplay({ fixedDp: 2, asNumber: true }),
    balanceCurrencyDisplayValue: balanceInCurrency?.toDisplay({ fixedDp: 2 }),
    priceInCurrency,
    coingeckoId,
  };
};
