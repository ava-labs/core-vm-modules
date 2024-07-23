import type { CurrencyCode } from '@avalabs/glacier-sdk';
import { TokenType, type NetworkTokenWithBalance } from '@avalabs/vm-module-types';
import { balanceToDisplayValue, bnToBig } from '@avalabs/utils-sdk';
import { BN } from 'bn.js';
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
  const balance = new BN(nativeTokenBalance.balance);
  const balanceDisplayValue = balanceToDisplayValue(balance, nativeTokenBalance.decimals);
  const priceInCurrency = nativeTokenBalance.price?.value;
  const balanceInCurrency = priceInCurrency
    ? bnToBig(balance, nativeTokenBalance.decimals).mul(priceInCurrency).toNumber()
    : undefined;
  const balanceCurrencyDisplayValue = balanceInCurrency ? balanceInCurrency.toFixed(2) : '';

  return {
    name: nativeTokenBalance.name,
    symbol: nativeTokenBalance.symbol,
    decimals: nativeTokenBalance.decimals,
    type: TokenType.NATIVE,
    logoUri: nativeTokenBalance.logoUri,
    balance,
    balanceDisplayValue,
    balanceInCurrency,
    balanceCurrencyDisplayValue,
    priceInCurrency,
    coingeckoId,
  };
};
