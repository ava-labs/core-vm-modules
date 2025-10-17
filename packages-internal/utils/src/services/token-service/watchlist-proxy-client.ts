import { fetchAndVerify } from '../../utils/fetch-and-verify';
import { z } from 'zod';

const WatchlistTokenResponseSchema = z.array(
  z.object({
    // the object has more properties than the ones listed here, but we only need these at the moment
    internalId: z.string(),
    id: z.string(),
    symbol: z.string(),
    name: z.string(),
    image: z.string().optional().nullable(),
    current_price: z.number().optional().nullable(),
    price_change_percentage_24h: z.number().optional().nullable(),
    market_cap: z.number().optional().nullable(),
    total_volume: z.number().optional().nullable(),
    platforms: z.record(z.string(), z.string()),
  }),
);

export class WatchlistProxyClient {
  constructor(private proxyApiUrl: string) {}

  watchlistToken(params: { tokens: string; currency: string }) {
    // casting params as any since typing does not allow boolean and other non-string values
    // even though NodeJS does not have this restriction itself: https://nodejs.org/api/url.html#new-urlsearchparamsobj
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryParams = new URLSearchParams(params as any);
    return fetchAndVerify(
      [
        `${this.proxyApiUrl}/proxy/watchlist/tokens?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ],
      WatchlistTokenResponseSchema,
    );
  }
}
