import { TokenUnit } from '@avalabs/core-utils-sdk';
import type { BalanceChange, NetworkToken } from '@avalabs/vm-module-types';
import { identifySystemInstruction, parseTransferSolInstruction, SystemInstruction } from '@solana-program/system';
import { isInstructionWithAccounts, isInstructionWithData, type IInstruction } from '@solana/kit';

import { addressItem } from '@internal/utils';

export const tryToParseSolTransfer = (
  instruction: IInstruction,
  balanceChange: BalanceChange,
  account: string,
  networkToken: NetworkToken,
) => {
  if (!isInstructionWithAccounts(instruction) || !isInstructionWithData(instruction)) {
    return;
  }

  try {
    const systemInstruction = identifySystemInstruction(instruction);

    if (systemInstruction !== SystemInstruction.TransferSol) {
      return null;
    }

    const { accounts, data } = parseTransferSolInstruction(instruction);

    const isOutgoing = accounts.source.address === account;
    const balanceChangeKey = isOutgoing === true ? 'outs' : 'ins';

    balanceChange[balanceChangeKey].push({
      token: {
        ...networkToken,
        address: '',
      },
      items: [
        {
          displayValue: new TokenUnit(data.amount, networkToken.decimals, '').toString(),
          usdPrice: undefined,
        },
      ],
    });

    return {
      title: 'Native Transfer',
      items: [addressItem('From', accounts.source.address), addressItem('To', accounts.destination.address)],
    };
  } catch {
    return null;
  }
};
