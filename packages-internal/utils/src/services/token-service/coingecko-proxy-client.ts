import { RawSimplePriceResponseSchema, SimplePriceResponseSchema } from '@avalabs/vm-module-types';
import { fetchAndVerify } from '../../utils/fetch-and-verify';

export class CoingeckoProxyClient {
  constructor(private proxyApiUrl: string) {}

  simplePrice(params: {
    ids: string[];
    vs_currencies: string[];
    include_market_cap?: boolean;
    include_24hr_vol?: boolean;
    include_24hr_change?: boolean;
    include_last_updated_at?: boolean;
  }) {
    // casting params as any since typing does not allow boolean and other non-string values
    // even though NodeJS does not have this restriction itself: https://nodejs.org/api/url.html#new-urlsearchparamsobj
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryParams = new URLSearchParams(params as any);
    return fetchAndVerify(
      [
        `${this.proxyApiUrl}/proxy/coingecko/simple/price?${queryParams}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ],
      RawSimplePriceResponseSchema,
    );
  }

  simplePriceByContractAddresses(params: {
    id: string;
    contract_addresses: string[];
    vs_currencies?: string[];
    include_market_cap?: boolean;
    include_24hr_vol?: boolean;
    include_24hr_change?: boolean;
  }) {
    const { id, ...rawQueryParams } = params;

    // casting params as any since typing does not allow boolean and other non-string values
    // even though NodeJS does not have this restriction itself: https://nodejs.org/api/url.html#new-urlsearchparamsobj
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryParams = new URLSearchParams(rawQueryParams as any);

    return fetchAndVerify(
      [
        `${this.proxyApiUrl}/proxy/coingecko/simple/token_price/${id}?${queryParams}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ],
      SimplePriceResponseSchema,
    );
  }
}
