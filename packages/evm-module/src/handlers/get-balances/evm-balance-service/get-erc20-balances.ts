import { TokenUnit, bigToBN, bigintToBig } from '@avalabs/utils-sdk';
import { TokenType, type Network, type NetworkContractToken, type TokenWithBalance } from '@avalabs/vm-module-types';
import { ethers, type Provider } from 'ethers';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';
import type { TokenService } from '@internal/utils';
import { VsCurrencyType } from '@avalabs/coingecko-sdk';

const DEFAULT_DECIMALS = 18;

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
  tokens: NetworkContractToken[];
  network: Network;
}): Promise<Record<string, TokenWithBalance>> => {
  const coingeckoPlatformId = network.pricingProviders?.coingecko.assetPlatformId;
  const coingeckoTokenId = network.pricingProviders?.coingecko.nativeTokenId;
  const tokenAddresses = tokens.map((token) => token.address);

  const tokensBalances = await Promise.allSettled(
    tokens.map(async (token) => {
      const contract = new ethers.Contract(token.address, ERC20.abi, provider);
      const balanceBig = await contract.balanceOf?.(userAddress);
      const balance = new TokenUnit(balanceBig, token.decimals ?? DEFAULT_DECIMALS, token.symbol);

      const tokenWithBalance = {
        ...token,
        balance,
      };

      return tokenWithBalance;
    }),
  ).then((res) => {
    return res.reduce<(NetworkContractToken & { balance: TokenUnit })[]>((acc, result) => {
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
      const priceInCurrency = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.price ?? 0;
      const marketCap = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.marketCap ?? 0;
      const vol24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.vol24 ?? 0;
      const change24 = simplePriceResponse?.[coingeckoTokenId ?? '']?.[currency]?.change24 ?? 0;

      const balanceBig = bigintToBig(token.balance.toSubUnit(), token.balance.getMaxDecimals());
      const balance = bigToBN(balanceBig, token.balance.getMaxDecimals());
      const balanceInCurrency = Number(token.balance.mul(priceInCurrency).toSubUnit());
      const balanceDisplayValue = token.balance.toDisplay();
      const balanceCurrencyDisplayValue = token.balance.mul(priceInCurrency).toDisplay();

      return {
        ...acc,
        [token.address.toLowerCase()]: {
          ...token,
          type: TokenType.ERC20,
          balance,
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
