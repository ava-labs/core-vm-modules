import { Erc20Tx, NormalTx } from '@avalabs/etherscan-sdk';

export function getFeeString(tx: NormalTx | Erc20Tx): string {
  return (Number(tx.gasUsed ?? '0') * Number(tx.gasPrice ?? '0')).toString();
}
