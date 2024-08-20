export type AvalancheTxParams = {
  transactionHex: string;
  chainAlias: 'X' | 'P' | 'C';
  externalIndices?: number[];
  internalIndices?: number[];
  utxos?: string[];
};
