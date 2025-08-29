import Blockaid from '@blockaid/client';
import type { TransactionBulkScanParams } from '@blockaid/client/resources/evm/transaction-bulk';

import type { TransactionBatchParams, TransactionParams } from '../types';
import { getBlockaid } from './blockaid';

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
  const blockaid = getBlockaid(proxyApiUrl);

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
  const blockaid = getBlockaid(proxyApiUrl);

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
      // TODO: provide accessList once Blockaid supports it
      // access_list: params.accessList
    },
    metadata: (domain && domain.length > 0 ? { domain } : { non_dapp: true }) as Blockaid.Evm.MetadataParam,
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
  const blockaid = getBlockaid(proxyApiUrl);

  return blockaid.evm.jsonRpc.scan({
    chain: chainId.toString(),
    options: ['validation', 'simulation'],
    account_address: accountAddress,
    data,
    metadata: (domain && domain.length > 0 ? { domain } : { non_dapp: true }) as Blockaid.Evm.MetadataParam,
  });
};
