import http from 'http';
import Blockaid from '@blockaid/client';
import type { TransactionBulkScanParams } from '@blockaid/client/resources/evm/transaction-bulk';

import type { TransactionBatchParams, TransactionParams } from '../types';

const DUMMY_API_KEY = 'DUMMY_API_KEY'; // since we're using our own proxy and api key is handled there, we can use a dummy key here

export const scanTransactionBatch = async ({
  proxyApiUrl,
  chainId,
  params,
  domain,
  withGasEstimation,
}: {
  proxyApiUrl: string;
  chainId: number;
  params: TransactionBatchParams;
  domain?: string;
  withGasEstimation?: boolean;
}): Promise<Blockaid.TransactionScanResponse[]> => {
  const blockaid = new Blockaid({
    baseURL: proxyApiUrl + '/proxy/blockaid/',
    apiKey: DUMMY_API_KEY,
    fetch: global.fetch,
    httpAgent: new http.Agent({ keepAlive: false }),
  });

  const options: TransactionBulkScanParams['options'] = ['validation', 'simulation'];

  if (withGasEstimation) {
    options.push('gas_estimation');
  }

  return blockaid.evm.transactionBulk.scan({
    chain: chainId.toString(),
    options,
    data: params,
    metadata: (domain && domain.length > 0 ? { domain } : { non_dapp: true }) as Blockaid.Evm.MetadataParam,
  });
};

export const scanTransaction = async ({
  proxyApiUrl,
  chainId,
  params,
  domain,
}: {
  proxyApiUrl: string;
  chainId: number;
  params: TransactionParams;
  domain?: string;
}): Promise<Blockaid.TransactionScanResponse> => {
  const blockaid = new Blockaid({
    baseURL: proxyApiUrl + '/proxy/blockaid/',
    apiKey: DUMMY_API_KEY,
    fetch: global.fetch,
    httpAgent: new http.Agent({ keepAlive: false }),
  });

  return blockaid.evm.transaction.scan(
    {
      account_address: params.from,
      chain: chainId.toString(),
      options: ['validation', 'simulation'],
      data: {
        from: params.from,
        to: params.to,
        data: params.data,
        value: params.value,
        gas: params.gas,
        gas_price: params.gasPrice,
        // TODO: provide accessList once Blockaid supports it
        // access_list: params.accessList
      },
      metadata: (domain && domain.length > 0 ? { domain } : { non_dapp: true }) as Blockaid.Evm.MetadataParam,
    },
    { httpAgent: new http.Agent({ keepAlive: false }) },
  );
};

export const scanJsonRpc = async ({
  proxyApiUrl,
  chainId,
  accountAddress,
  data,
  domain,
}: {
  proxyApiUrl: string;
  chainId: number;
  accountAddress: string;
  data: Blockaid.Evm.JsonRpcScanParams.Data;
  domain?: string;
}): Promise<Blockaid.TransactionScanResponse> => {
  const blockaid = new Blockaid({
    baseURL: proxyApiUrl + '/proxy/blockaid/',
    apiKey: DUMMY_API_KEY,
    fetch: global.fetch,
    httpAgent: new http.Agent({ keepAlive: false }),
  });

  return blockaid.evm.jsonRpc.scan({
    chain: chainId.toString(),
    options: ['validation', 'simulation'],
    account_address: accountAddress,
    data,
    metadata: (domain && domain.length > 0 ? { domain } : { non_dapp: true }) as Blockaid.Evm.MetadataParam,
  });
};

// dummyHttpAgent.ts
export interface HttpAgentLike {
  addRequest?: (req: unknown, opts: unknown) => void;
  destroy?: () => void;
  keepAlive?: boolean;
}

export const dummyHttpAgent: HttpAgentLike = {
  addRequest: () => {},
  destroy: () => {},
  keepAlive: true,
};
