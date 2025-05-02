import type { Hex, RpcRequest } from '@avalabs/vm-module-types';
import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import { getExplorerAddressByNetwork } from '@src/handlers/get-transaction-history/utils/get-explorer-address-by-network';

export const waitForTransactionReceipt = async ({
  explorerUrl,
  provider,
  txHash,
  onTransactionPending,
  onTransactionConfirmed,
  onTransactionReverted,
  request,
}: {
  explorerUrl: string;
  provider: JsonRpcBatchInternal;
  txHash: Hex;
  onTransactionPending: ({ txHash, request }: { txHash: Hex; request: RpcRequest }) => void;
  onTransactionConfirmed: ({
    txHash,
    explorerLink,
    request,
  }: {
    txHash: Hex;
    explorerLink: string;
    request: RpcRequest;
  }) => void;
  onTransactionReverted: ({ txHash, request }: { txHash: Hex; request: RpcRequest }) => void;
  request: RpcRequest;
}) => {
  try {
    onTransactionPending({ txHash, request });

    const receipt = await provider.waitForTransaction(txHash);

    const success = receipt?.status === 1; // 1 indicates success, 0 indicates revert

    const explorerLink = getExplorerAddressByNetwork(explorerUrl, txHash);

    if (success) {
      onTransactionConfirmed({ txHash, explorerLink, request });
      return true;
    }
  } catch (error) {
    console.error(error);
  }

  onTransactionReverted({ txHash, request });

  return false;
};
