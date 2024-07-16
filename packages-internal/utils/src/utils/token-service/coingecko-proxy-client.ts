import { Zodios } from '@zodios/core';
import { RawSimplePriceResponseSchema, SimplePriceResponseSchema } from '@avalabs/vm-module-types';
import { boolean, string } from 'zod';

export const coingeckoProxyClient = (proxyApiUrl: string) =>
  new Zodios(
    `${proxyApiUrl}/proxy/coingecko`,
    [
      {
        method: 'post',
        path: '/simple/price',
        parameters: [
          { name: 'ids', type: 'Query', schema: string() },
          { name: 'vs_currencies', type: 'Query', schema: string() },
          {
            name: 'include_market_cap',
            type: 'Query',
            schema: string().optional(),
          },
          {
            name: 'include_24hr_vol',
            type: 'Query',
            schema: string().optional(),
          },
          {
            name: 'include_24hr_change',
            type: 'Query',
            schema: string().optional(),
          },
          {
            name: 'include_last_updated_at',
            type: 'Query',
            schema: string().optional(),
          },
        ],
        alias: 'simplePrice',
        response: RawSimplePriceResponseSchema,
      },
      {
        method: 'post',
        path: '/simple/token_price/:id',
        parameters: [
          { name: 'id', type: 'Path', schema: string() },
          { name: 'contract_addresses', type: 'Query', schema: string().array() },
          { name: 'vs_currencies', type: 'Query', schema: string().array() },
          {
            name: 'include_market_cap',
            type: 'Query',
            schema: boolean().optional(),
          },
          {
            name: 'include_24hr_vol',
            type: 'Query',
            schema: boolean().optional(),
          },
          {
            name: 'include_24hr_change',
            type: 'Query',
            schema: boolean().optional(),
          },
        ],
        alias: 'simplePriceByContractAddresses',
        response: SimplePriceResponseSchema,
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
