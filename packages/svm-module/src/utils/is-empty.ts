import type { BalanceChange } from '@avalabs/vm-module-types';

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

export function isEmpty(input: unknown): boolean {
  if (isBalanceChange(input)) {
    return input.ins.length === 0 && input.outs.length === 0;
  }

  return Boolean(input);
}
