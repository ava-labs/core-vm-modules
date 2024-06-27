import { Zodios } from '@zodios/core';
import { array, boolean, string } from 'zod';
import { CoinMarketSchema, SimplePriceResponseSchema } from './coingecko-types';

export const watchlistCacheClient = (proxyApiUrl: string) =>
  new Zodios(
    `${proxyApiUrl}/watchlist`,
    [
      {
        method: 'get',
        path: '/price',
        alias: 'simplePrice',
        response: SimplePriceResponseSchema,
      },
      {
        method: 'get',
        path: '/markets',
        parameters: [
          { name: 'currency', type: 'Query', schema: string() },
          { name: 'topMarkets', type: 'Query', schema: boolean().optional() },
          { name: 'timestamp', type: 'Query', schema: string().optional() },
        ],
        alias: 'markets',
        response: array(CoinMarketSchema),
      },
    ],
    {
      axiosConfig: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    },
  );
