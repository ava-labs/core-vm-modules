import { TokenUnit } from '@avalabs/utils-sdk';
import { TokenType, type NetworkToken, type NetworkTokenWithBalance } from '@avalabs/vm-module-types';
import type { VsCurrencyType } from '@avalabs/coingecko-sdk';
import { TokenService } from '../../../token-service/token-service';
import type { Provider } from 'ethers';

export const getNativeTokenBalance = async ({
  provider,
  tokenService,
  accountAddress,
  nativeTokenId,
  currency,
  networkToken,
}: {
  provider: Provider;
  tokenService: TokenService;
  accountAddress: string;
  nativeTokenId: string;
  currency: string;
  networkToken: NetworkToken;
}): Promise<NetworkTokenWithBalance> => {
  const balanceBigint = await provider.getBalance(accountAddress);
  const balance = new TokenUnit(balanceBigint, networkToken.decimals, networkToken.symbol);

  const {
    price: priceInCurrency,
    marketCap,
    vol24,
    change24,
  } = await tokenService.getPriceWithMarketDataByCoinId(nativeTokenId, currency as VsCurrencyType);

  const balanceInCurrency = Number(balance.mul(priceInCurrency).toSubUnit());
  const balanceCurrencyDisplayValue = balance.mul(priceInCurrency).toDisplay();

  return {
    ...networkToken,
    coingeckoId: nativeTokenId ?? '',
    type: TokenType.NATIVE,
    balance,
    balanceDisplayValue: balance.toDisplay(),
    balanceInCurrency,
    balanceCurrencyDisplayValue,
    priceInCurrency,
    marketCap,
    vol24,
    change24,
  };
};
