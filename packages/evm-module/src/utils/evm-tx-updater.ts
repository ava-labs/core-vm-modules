import { rpcErrors } from '@metamask/rpc-errors';
import type { DisplayData, EvmTxUpdateFn, RpcMethod, SigningData, TokenApprovals } from '@avalabs/vm-module-types';

import { ERC20TransactionType } from '../types';
import { parseERC20TransactionType } from './parse-erc20-transaction-type';
import { encodeApprovalLimit } from './encode-erc20-approval';

type SigningData_EthSendTx = Extract<SigningData, { type: RpcMethod.ETH_SEND_TRANSACTION }>;

const requests = new Map<string, { displayData: DisplayData; signingData: SigningData_EthSendTx }>();

export const getTxUpdater = (
  requestId: string,
  signingData: SigningData_EthSendTx,
  displayData: DisplayData,
): { updateTx: EvmTxUpdateFn; cleanup: () => void } => {
  requests.set(requestId, { signingData, displayData });

  return {
    updateTx: ({ maxFeeRate, maxTipRate, approvalLimit }) => {
      const request = requests.get(requestId);

      if (!request) {
        throw rpcErrors.resourceNotFound();
      }

      const { signingData, displayData } = request;

      const newSigningData = {
        ...signingData,
        data: {
          ...signingData.data,
          maxFeePerGas: maxFeeRate ?? signingData.data.maxFeePerGas,
          maxPriorityFeePerGas: maxTipRate ?? signingData.data.maxPriorityFeePerGas,
        },
      };

      const newDisplayData = { ...displayData };

      if (typeof approvalLimit === 'string') {
        if (!approvalLimit.startsWith('0x')) {
          throw rpcErrors.invalidInput('Expected approvalLimit to be a hexadecimal number (0x-prefixed)');
        }

        const tokenApprovals = displayData.tokenApprovals;

        ensureTokenApprovalCanBeEdited(tokenApprovals);
        ensureApproveWasCalled(signingData.data.data);

        const approval = tokenApprovals.approvals[0]!;

        newSigningData.data.data = encodeApprovalLimit(approval.token.address, approval.spenderAddress, approvalLimit);
        newDisplayData.tokenApprovals = {
          approvals: [
            {
              ...approval,
              value: approvalLimit,
            },
          ],
          isEditable: true,
        };
      }

      const updatedRequest = { signingData: newSigningData, displayData: newDisplayData };

      requests.set(requestId, updatedRequest);

      return updatedRequest;
    },
    cleanup: () => requests.delete(requestId),
  };
};

function ensureTokenApprovalCanBeEdited(
  tokenApprovals?: TokenApprovals,
): asserts tokenApprovals is TokenApprovals & { isEditable: true } {
  if (!tokenApprovals || !tokenApprovals.isEditable || tokenApprovals.approvals.length !== 1) {
    throw rpcErrors.invalidInput(
      'Cannot edit the token approval for this request. Please start a new request instead.',
    );
  }
}

function ensureApproveWasCalled(txData?: string | null) {
  const previousMethod = !txData || txData === '0x' ? null : parseERC20TransactionType({ data: txData ?? undefined });

  // If original tx was not setting any approvals, do not allow it to be set later on.
  if (previousMethod !== ERC20TransactionType.APPROVE) {
    throw rpcErrors.invalidInput(
      'Cannot change invoked method for requests in progress. Please start a new request instead.',
    );
  }
}
