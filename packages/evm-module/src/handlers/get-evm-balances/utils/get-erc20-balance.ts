import { TokenUnit } from '@avalabs/utils-sdk';
import { TokenType, type NetworkContractToken, type TokenWithBalanceERC20 } from '@avalabs/vm-module-types';
import { ethers, type Provider } from 'ethers';
import type { TokenService } from '../../../token-service/token-service';
import type { VsCurrencyType } from '@avalabs/coingecko-sdk';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';

const DEFAULT_DECIMALS = 18;

export const getErc20Balances = async ({
  provider,
  tokenService,
  tokens,
  assetPlatformId,
  accountAddress,
  currency,
}: {
  provider: Provider;
  tokenService: TokenService;
  accountAddress: string;
  tokens: NetworkContractToken[];
  assetPlatformId?: string;
  currency: string;
}): Promise<TokenWithBalanceERC20[]> => {
  const tokenAddresses = tokens.map((token) => token.address);

  const tokenPriceDict =
    (assetPlatformId &&
      (await tokenService.getPricesWithMarketDataByAddresses(
        tokenAddresses,
        assetPlatformId,
        currency as VsCurrencyType,
      ))) ||
    {};

  return Promise.allSettled(
    tokens.map(async (token) => {
      const tokenDecimals = token.decimals ?? DEFAULT_DECIMALS;
      const tokenPrice = tokenPriceDict[token.address.toLowerCase()]?.[currency as VsCurrencyType];
      const contract = new ethers.Contract(token.address, ERC20.abi, provider);
      const balanceBigInt = await contract.balanceOf?.(accountAddress);
      const balance = new TokenUnit(balanceBigInt, tokenDecimals, token.symbol);
      const priceInCurrency = tokenPrice?.price ?? 0;
      const marketCap = tokenPrice?.marketCap ?? 0;
      const change24 = tokenPrice?.change24 ?? 0;
      const vol24 = tokenPrice?.vol24 ?? 0;
      const balanceInCurrency = Number(balance.mul(priceInCurrency).toSubUnit());
      const balanceDisplayValue = balance.toDisplay();
      const balanceCurrencyDisplayValue = balance.mul(priceInCurrency).toDisplay();

      return {
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
      } as TokenWithBalanceERC20;
    }),
  ).then((res) => {
    return res.reduce<TokenWithBalanceERC20[]>((acc, result) => {
      return result.status === 'fulfilled' ? [...acc, result.value] : acc;
    }, []);
  });
};
