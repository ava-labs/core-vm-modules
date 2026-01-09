import type { Hex, RpcRequest } from '@avalabs/vm-module-types';
import type { BitcoinProvider } from '@avalabs/core-wallets-sdk';

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
  provider: BitcoinProvider;
  txHash: Hex;
  onTransactionPending: ({
    txHash,
    request,
    explorerLink,
  }: {
    txHash: Hex;
    request: RpcRequest;
    explorerLink: string;
  }) => void;
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
    const explorerLink = `${explorerUrl}/tx/${txHash}`;
    onTransactionPending({ txHash, request, explorerLink });
    await provider.waitForTx(txHash);
    onTransactionConfirmed({ txHash, explorerLink, request });
  } catch (err) {
    console.error(err);
    onTransactionReverted({ txHash, request });
  }
};
