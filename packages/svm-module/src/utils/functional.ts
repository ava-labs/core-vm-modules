import type { BalanceChange } from '@avalabs/vm-module-types';

export function isBalanceChangeEmpty(input: BalanceChange): boolean {
  return input.ins.length === 0 && input.outs.length === 0;
}

export function isNotNullish<I>(input: I): input is NonNullable<I> {
  return input !== null && input !== undefined;
}
