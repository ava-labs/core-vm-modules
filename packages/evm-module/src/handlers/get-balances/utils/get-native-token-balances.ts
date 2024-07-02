import { TokenUnit, bigToBN, bigintToBig, stringToBN } from '@avalabs/utils-sdk';
import { TokenType, type NetworkToken, type NetworkTokenWithBalance } from '@avalabs/vm-module-types';
import type { VsCurrencyType } from '@avalabs/coingecko-sdk';
import { TokenService } from '../../../token-service/token-service';
import type { Provider } from 'ethers';
import { Glacier, type CurrencyCode } from '@avalabs/glacier-sdk';

export const getNativeTokenBalance = async ({
  provider,
  tokenService,
  address,
  coingeckoTokenId,
  currency,
  networkToken,
  chainId,
  glacierSdk,
}: {
  provider: Provider;
  tokenService: TokenService;
  address: string;
  coingeckoTokenId?: string;
  currency: string;
  networkToken: NetworkToken;
  chainId: string;
  glacierSdk: Glacier;
}): Promise<NetworkTokenWithBalance> => {
  const supportedChainsResp = await glacierSdk.evmChains.supportedChains({});

  const chains = supportedChainsResp.chains.map((chain) => chain.chainId);
  if (chains.includes(chainId)) {
    return getNativeTokenBalancesFromGlacier({ address, currency, chainId, glacierSdk });
  }
  return getNativeTokenBalanceFromProvider({
    provider,
    tokenService,
    address,
    coingeckoTokenId,
    currency,
    networkToken,
  });
};

const getNativeTokenBalanceFromProvider = async ({
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

const getNativeTokenBalancesFromGlacier = async ({
  address,
  currency,
  chainId,
  glacierSdk,
}: {
  chainId: string;
  address: string;
  currency: string;
  glacierSdk: Glacier;
}): Promise<NetworkTokenWithBalance> => {
  const nativeBalance = await glacierSdk.evmBalances.getNativeBalance({
    chainId,
    address,
    currency: currency.toLocaleLowerCase() as CurrencyCode,
  });
  const nativeTokenBalance = nativeBalance.nativeTokenBalance;
  const balanceTokenUnit = new TokenUnit(
    nativeTokenBalance.balance,
    nativeTokenBalance.decimals,
    nativeTokenBalance.symbol,
  );
  // todo: simply return TokenUnit when we have all modules implemented
  const balance = stringToBN(nativeTokenBalance.balance, nativeTokenBalance.decimals);
  const balanceDisplayValue = balanceTokenUnit.toDisplay();
  const priceInCurrency = nativeTokenBalance.price?.value ?? 0;
  const balanceInCurrency = Number(balanceTokenUnit.mul(priceInCurrency).toSubUnit());
  const balanceCurrencyDisplayValue = nativeTokenBalance.balanceValue?.value.toString() ?? '0';

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
    marketCap: 0,
    vol24: 0,
    change24: 0,
    coingeckoId: '',
  };
};
