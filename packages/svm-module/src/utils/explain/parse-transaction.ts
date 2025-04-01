import type { BalanceChange, Network, SPLToken } from '@avalabs/vm-module-types';
import { deserializeTransactionMessage } from '@avalabs/core-wallets-sdk';

import { isFulfilled } from '@internal/utils/src/utils/is-promise-fulfilled';

import { isNotNullish } from '../functional';
import type { getProvider } from '../get-provider';
import { tryToParseSolTransfer } from './instruction-parsers/sol-transfer';
import { tryToParseSPLTransfer } from './instruction-parsers/spl-transfer';

export const parseTransaction = async (
  serializedTx: string,
  account: string,
  network: Network,
  provider: ReturnType<typeof getProvider>,
) => {
  const transaction = await deserializeTransactionMessage(serializedTx, provider);
  const balanceChange: BalanceChange = {
    ins: [],
    outs: [],
  };

  const details = await Promise.allSettled(
    transaction.instructions.map(async (instruction) => {
      return (
        tryToParseSolTransfer(instruction, balanceChange, account, network.networkToken) ??
        (await tryToParseSPLTransfer(provider, instruction, balanceChange, account, network.tokens as SPLToken[])) ??
        null
      );
    }),
  ).then((results) =>
    results
      .filter(isFulfilled)
      .map((result) => result.value)
      .filter(isNotNullish),
  );

  return {
    balanceChange,
    details,
  };
};
