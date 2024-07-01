import { TokenUnit, bigToBN, bigintToBig } from '@avalabs/utils-sdk';
import { TokenType, type NetworkToken, type NetworkTokenWithBalance } from '@avalabs/vm-module-types';
import type { VsCurrencyType } from '@avalabs/coingecko-sdk';
import { TokenService } from '../../../token-service/token-service';
import type { Provider } from 'ethers';

export const getNativeTokenBalance = async ({
  provider,
  tokenService,
  address,
  coingeckoTokenId,
  currency,
  networkToken,
}: {
  provider: Provider;
  tokenService: TokenService;
  address: string;
  coingeckoTokenId?: string;
  currency: string;
  networkToken: NetworkToken;
}): Promise<NetworkTokenWithBalance> => {
  const simplePriceResponse = coingeckoTokenId
    ? await tokenService.getSimplePrice({
        coinIds: [coingeckoTokenId],
        currencies: [currency] as VsCurrencyType[],
      })
    : {};

  const priceInCurrency = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.price ?? 0;
  const marketCap = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.marketCap ?? 0;
  const vol24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.vol24 ?? 0;
  const change24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.change24 ?? 0;

  const balanceBigint = await provider.getBalance(address);
  // todo: simply return TokenUnit when we have all modules implemented
  const balaceBig = bigintToBig(balanceBigint, networkToken.decimals);
  const balance = bigToBN(balaceBig, networkToken.decimals);
  const balanceTokenUnit = new TokenUnit(balanceBigint, networkToken.decimals, networkToken.symbol);
  const balanceInCurrency = Number(balanceTokenUnit.mul(priceInCurrency).toSubUnit());
  const balanceCurrencyDisplayValue = balanceTokenUnit.mul(priceInCurrency).toDisplay();

  return {
    ...networkToken,
    coingeckoId: coingeckoTokenId ?? '',
    type: TokenType.NATIVE,
    balance,
    balanceDisplayValue: balanceTokenUnit.toDisplay(),
    balanceInCurrency,
    balanceCurrencyDisplayValue,
    priceInCurrency,
    marketCap,
    vol24,
    change24,
  };
};
