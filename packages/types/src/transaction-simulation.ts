import type { Alert } from './rpc';
import type { NetworkContractToken, NetworkToken } from './token';

export type BalanceChange = {
  ins: TokenDiff[];
  outs: TokenDiff[];
};

export type TokenDiff = {
  token: NetworkContractToken | NetworkToken;
  items: TokenDiffItem[];
};

export type TokenDiffItem = {
  displayValue: string;
  usdPrice: string | undefined;
  logoUri?: string;
  tokenId?: string;
};

export type TokenApproval = {
  token: NetworkContractToken;
  spenderAddress: string;
  value?: string;
  usdPrice?: string;
  logoUri?: string;
};

export type TokenApprovals = {
  isEditable: boolean;
  approvals: TokenApproval[];
};

export type TransactionSimulationResult = {
  alert?: Alert;
  balanceChange?: BalanceChange;
  tokenApprovals?: TokenApprovals;
  isSimulationSuccessful: boolean;
  estimatedGasLimit?: number;
};
