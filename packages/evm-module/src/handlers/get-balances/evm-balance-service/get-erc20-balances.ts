import { numberToBN, bnToBig, balanceToDisplayValue } from '@avalabs/utils-sdk';
import { TokenType, type ERC20Token, type Network, type TokenWithBalance } from '@avalabs/vm-module-types';
import { ethers, type Provider } from 'ethers';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';
import type { TokenService } from '@internal/utils';
import { VsCurrencyType } from '@avalabs/coingecko-sdk';
import BN from 'bn.js';

export const getErc20Balances = async ({
  provider,
  tokenService,
  address: userAddress,
  currency,
  tokens,
  network,
}: {
  provider: Provider;
  tokenService: TokenService;
  address: string;
  currency: string;
  tokens: ERC20Token[];
  network: Network;
}): Promise<Record<string, TokenWithBalance>> => {
  const coingeckoPlatformId = network.pricingProviders?.coingecko.assetPlatformId;
  const coingeckoTokenId = network.pricingProviders?.coingecko.nativeTokenId;
  const tokenAddresses = tokens.map((token) => token.address);

  const tokensBalances = await Promise.allSettled(
    tokens.map(async (token) => {
      const contract = new ethers.Contract(token.address, ERC20.abi, provider);
      const balanceBig = await contract.balanceOf?.(userAddress);
      const balance = new BN(balanceBig) || numberToBN(0, token.decimals);

      const tokenWithBalance = {
        ...token,
        balance,
      };

      return tokenWithBalance;
    }),
  ).then((res) => {
    return res.reduce<(ERC20Token & { balance: BN })[]>((acc, result) => {
      return result.status === 'fulfilled' && !result.value.balance.isZero() ? [...acc, result.value] : acc;
    }, []);
  });

  if (!tokensBalances.length) return {};

  const simplePriceResponse =
    (coingeckoPlatformId &&
      (await tokenService.getPricesByAddresses(tokenAddresses, coingeckoPlatformId, currency as VsCurrencyType))) ||
    {};

  return tokensBalances.reduce(
    (acc, token) => {
      const priceInCurrency = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.price ?? undefined;
      const marketCap = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.marketCap ?? undefined;
      const vol24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.vol24 ?? undefined;
      const change24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.change24 ?? undefined;

      const balanceInCurrency = priceInCurrency
        ? bnToBig(token.balance, token.decimals).mul(priceInCurrency).toNumber()
        : undefined;
      const balanceDisplayValue = balanceToDisplayValue(token.balance, token.decimals);
      const balanceCurrencyDisplayValue = balanceInCurrency?.toFixed(2);

      return {
        ...acc,
        [token.address.toLowerCase()]: {
          ...token,
          type: TokenType.ERC20,
          balance: token.balance,
          balanceDisplayValue,
          balanceInCurrency,
          balanceCurrencyDisplayValue,
          priceInCurrency,
          marketCap,
          change24,
          vol24,
        },
      };
    },
    {} as Record<string, TokenWithBalance>,
  );
};
