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
  const balanceTokenUnit = new TokenUnit(
    nativeTokenBalance.balance,
    nativeTokenBalance.decimals,
    nativeTokenBalance.symbol,
  );
  const balanceDisplayValue = balanceTokenUnit.toDisplay();
  const priceInCurrency = nativeTokenBalance.price?.value;
  const balanceCurrencyDisplayValue = priceInCurrency ? balanceTokenUnit.mul(priceInCurrency).toDisplay(2) : undefined;
  const balanceInCurrency = balanceCurrencyDisplayValue
    ? Number(balanceCurrencyDisplayValue.replaceAll(',', ''))
    : undefined;

  return {
    name: nativeTokenBalance.name,
    symbol: nativeTokenBalance.symbol,
    decimals: nativeTokenBalance.decimals,
    type: TokenType.NATIVE,
    logoUri: nativeTokenBalance.logoUri,
    balance: balanceTokenUnit.toSubUnit(),
    balanceDisplayValue,
    balanceInCurrency,
    balanceCurrencyDisplayValue,
    priceInCurrency,
    coingeckoId,
  };
};
