import Blockaid from '@blockaid/client';
import type { TransactionBulkScanParams } from '@blockaid/client/resources/evm/transaction-bulk';

import type { TransactionBatchParams, TransactionParams } from '../types';

export const scanTransactionBatch = async ({
  chainId,
  params,
  domain,
  withGasEstimation,
  blockaid,
}: {
  chainId: number;
  params: TransactionBatchParams;
  domain?: string;
  withGasEstimation?: boolean;
  blockaid: Blockaid;
}): Promise<Blockaid.TransactionScanResponse[]> => {
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
  chainId,
  params,
  domain,
  blockaid,
}: {
  chainId: number;
  params: TransactionParams;
  domain?: string;
  blockaid: Blockaid;
}): Promise<Blockaid.TransactionScanResponse> => {
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
      // Blockaid's scan API has no access_list field, so an EIP-2930 access list cannot be
      // included here. It is still signed and broadcast, which means the scan below covers
      // strictly less than the transaction does - processTransactionSimulation raises
      // `incompleteScanAlert` so the approval never presents this as full coverage.
      // TODO: send access_list once Blockaid supports it, and drop that alert.
    },
    metadata: (domain && domain.length > 0 ? { domain } : { non_dapp: true }) as Blockaid.Evm.MetadataParam,
  });
};

export const scanJsonRpc = async ({
  chainId,
  accountAddress,
  data,
  domain,
  blockaid,
}: {
  chainId: number;
  accountAddress: string;
  data: Blockaid.Evm.JsonRpcScanParams.Data;
  domain?: string;
  blockaid: Blockaid;
}): Promise<Blockaid.TransactionScanResponse> => {
  return blockaid.evm.jsonRpc.scan({
    chain: chainId.toString(),
    options: ['validation', 'simulation'],
    account_address: accountAddress,
    data,
    metadata: (domain && domain.length > 0 ? { domain } : { non_dapp: true }) as Blockaid.Evm.MetadataParam,
  });
};
