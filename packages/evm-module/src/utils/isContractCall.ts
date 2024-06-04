import { NormalTx } from '@avalabs/etherscan-sdk';

export function isContractCall(tx: NormalTx): boolean {
  return tx.input !== '0x';
}
