import Blockaid from '@blockaid/client';
import type { TransactionParams } from '../types';

const DUMMY_API_KEY = 'DUMMY_API_KEY'; // since we're using our own proxy and api key is handled there, we can use a dummy key here

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
  });

  return blockaid.evm.transaction.scan({
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
    },
    metadata: (domain && domain.length > 0 ? { domain } : { non_dapp: true }) as Blockaid.Evm.Metadata,
  });
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
  });

  return blockaid.evm.jsonRpc.scan({
    chain: chainId.toString(),
    options: ['validation', 'simulation'],
    account_address: accountAddress,
    data,
    metadata: (domain && domain.length > 0 ? { domain } : { non_dapp: true }) as Blockaid.Evm.Metadata,
  });
};
