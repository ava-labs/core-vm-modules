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
