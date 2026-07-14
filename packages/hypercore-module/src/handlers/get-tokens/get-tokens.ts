import type { HypercoreSpotToken, Network } from '@avalabs/vm-module-types';
import type { HypercoreInfoClient } from '../../utils/info-client';
import { hyperliquidCoinSvgUrl } from '../../utils/hyperliquid-coin-svg-url';
import { toHypercoreSpotTokens } from '../../utils/spot-tokens';

export const getTokens = async ({
  infoClient,
}: {
  network: Network;
  infoClient: HypercoreInfoClient;
}): Promise<HypercoreSpotToken[]> => {
  const spotMeta = await infoClient.getSpotMeta();
  return toHypercoreSpotTokens(spotMeta.tokens).map((token) => ({
    ...token,
    logoUri: token.logoUri ?? hyperliquidCoinSvgUrl(token.symbol),
  }));
};
