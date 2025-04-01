import { TokenUnit } from '@avalabs/core-utils-sdk';
import type { BalanceChange, DetailSection, NetworkToken } from '@avalabs/vm-module-types';
import {
  identifySystemInstruction,
  parseTransferSolInstruction,
  SYSTEM_PROGRAM_ADDRESS,
  SystemInstruction,
} from '@solana-program/system';
import {
  isInstructionForProgram,
  isInstructionWithAccounts,
  isInstructionWithData,
  type IInstruction,
} from '@solana/kit';

import { addressItem } from '@internal/utils';

export const tryToParseSolTransfer = (
  instruction: IInstruction,
  balanceChange: BalanceChange,
  account: string,
  networkToken: NetworkToken,
): DetailSection | null => {
  if (
    !isInstructionForProgram(instruction, SYSTEM_PROGRAM_ADDRESS) ||
    !isInstructionWithAccounts(instruction) ||
    !isInstructionWithData(instruction)
  ) {
    return null;
  }

  try {
    const systemInstruction = identifySystemInstruction(instruction);

    if (systemInstruction !== SystemInstruction.TransferSol) {
      return null;
    }

    const { accounts, data } = parseTransferSolInstruction({
      ...instruction,
      data: Uint8Array.from(instruction.data), // Fixing the typings here to satisfy parseTransferSolInstruction()
    });

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
      title: 'Transfer SOL',
      items: [addressItem('From', accounts.source.address), addressItem('To', accounts.destination.address)],
    };
  } catch {
    return null;
  }
};
