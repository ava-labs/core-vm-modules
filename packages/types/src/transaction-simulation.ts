import type { NetworkContractToken, NetworkToken } from './token';

export enum AlertType {
  WARNING = 'Warning',
  DANGER = 'Danger',
}

export type AlertDetails = {
  title: string;
  description: string;
  actionTitles?: {
    proceed: string;
    reject: string;
  };
};

export type Alert = {
  type: AlertType;
  details: AlertDetails;
};

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
