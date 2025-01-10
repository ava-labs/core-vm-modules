import {
  TokenType,
  type ApprovalController,
  type BalanceChange,
  type BatchApprovalController,
  type ERC1155Token,
  type ERC20Token,
  type ERC721Token,
  type NetworkContractToken,
  type NetworkToken,
  type TokenApprovals,
} from '@avalabs/vm-module-types';
import type { RequiredBy, TransactionParams } from '../types';

export function isNetworkToken(token: NetworkContractToken | NetworkToken): token is NetworkToken {
  return !('type' in token);
}

export function isERC20Token(token: NetworkContractToken): token is ERC20Token {
  return token.type === TokenType.ERC20;
}

export function isNftToken(token: NetworkContractToken): token is ERC1155Token | ERC721Token {
  return token.type === TokenType.ERC1155 || token.type === TokenType.ERC721;
}

export function hasToField(params: TransactionParams): params is RequiredBy<TransactionParams, 'to'> {
  return typeof params.to === 'string';
}

export function supportsBatchApprovals(
  controller: ApprovalController | BatchApprovalController,
): controller is BatchApprovalController {
  return 'requestBatchApproval' in controller && typeof controller.requestBatchApproval === 'function';
}

export function isBalanceChange(input: unknown): input is BalanceChange {
  return (
    typeof input === 'object' &&
    input !== null &&
    'ins' in input &&
    'outs' in input &&
    Array.isArray(input.ins) &&
    Array.isArray(input.outs)
  );
}

export function isTokenApprovals(input: unknown): input is TokenApprovals {
  return (
    typeof input === 'object' &&
    input !== null &&
    'approvals' in input &&
    'isEditable' in input &&
    Array.isArray(input.approvals)
  );
}

export function isEmpty(input: unknown): boolean {
  if (isBalanceChange(input)) {
    return input.ins.length === 0 && input.outs.length === 0;
  }

  if (isTokenApprovals(input)) {
    return input.approvals.length === 0;
  }

  return false;
}
