import type { NetworkContractToken, NetworkToken } from './token';

export enum TransactionValidationResultType {
  BENIGN = 'Benign',
  MALICIOUS = 'Malicious',
  WARNING = 'Warning',
  ERROR = 'Error',
}

export type TransactionValidationWarningDetails = {
  title: string;
  description: string;
  actionTitles?: {
    proceed: string;
    reject: string;
  };
};

export type TransactionValidation = {
  resultType: TransactionValidationResultType;
  warningDetails?: TransactionValidationWarningDetails;
};

export type TransactionSimulation = {
  assetDiffs: AssetDiffs;
  exposures: AssetExposure[];
};

export type AssetDiffs = {
  ins: AssetDiff[];
  outs: AssetDiff[];
};

export type AssetDiff = {
  token: NetworkContractToken | NetworkToken;
  items: AssetDiffItem[];
};

export type AssetDiffItem = {
  value: string;
  usdPrice: string | undefined;
};

export type AssetExposure = {
  token: NetworkContractToken;
  spenderAddress: string;
  value?: string;
  usdPrice?: string;
  logoUri?: string;
};
