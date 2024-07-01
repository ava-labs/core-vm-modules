import { TokenUnit, bigToBN, bigintToBig } from '@avalabs/utils-sdk';
import { TokenType, type NetworkContractToken, type TokenWithBalance } from '@avalabs/vm-module-types';
import { ethers, type Provider } from 'ethers';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';
import { getTokens } from '../../get-tokens/get-tokens';
import type { TokenService } from '../../../token-service/token-service';
import { VsCurrencyType } from '@avalabs/coingecko-sdk';

const DEFAULT_DECIMALS = 18;

export const getErc20Balances = async ({
  provider,
  tokenService,
  coingeckoPlatformId,
  coingeckoTokenId,
  address: userAddress,
  currency,
  chainId: caip2ChainId,
  proxyApiUrl,
}: {
  provider: Provider;
  tokenService: TokenService;
  address: string;
  coingeckoPlatformId?: string;
  coingeckoTokenId?: string;
  currency: string;
  chainId: string;
  proxyApiUrl: string;
}): Promise<Record<string, TokenWithBalance>> => {
  const chainId = caip2ChainId.split(':')[1];
  if (!chainId || isNaN(Number(chainId))) {
    throw new Error('Invalid chainId');
  }

  const tokens = await getTokens({ chainId: Number(chainId), proxyApiUrl });
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

      // todo: simply return TokenUnit when we have all modules implemented
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
