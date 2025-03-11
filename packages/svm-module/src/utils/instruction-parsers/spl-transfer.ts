import { TokenUnit } from '@avalabs/core-utils-sdk';
import type { SolanaProvider } from '@avalabs/core-wallets-sdk';
import type { BalanceChange, SPLToken } from '@avalabs/vm-module-types';
import { parseTransferInstruction, identifyTokenInstruction, TokenInstruction } from '@solana-program/token';
import { isInstructionWithAccounts, isInstructionWithData, type Address, type IInstruction } from '@solana/kit';

import { addressItem } from '@internal/utils';

const getTokenMintFromAccountInfo = async (provider: SolanaProvider, account: Address): Promise<string | null> => {
  try {
    const tokenAccountDetails = await provider.getAccountInfo(account, { encoding: 'jsonParsed' }).send();

    if (Array.isArray(tokenAccountDetails.value?.data)) {
      return null;
    }

    const info = tokenAccountDetails.value?.data.parsed.info as Record<string, unknown>;
    return typeof info?.mint === 'string' ? info.mint : null;
  } catch {
    return null;
  }
};

export const tryToParseSPLTransfer = async (
  provider: SolanaProvider,
  instruction: IInstruction,
  balanceChange: BalanceChange,
  account: string,
  tokens?: SPLToken[],
) => {
  if (!tokens?.length || !isInstructionWithAccounts(instruction) || !isInstructionWithData(instruction)) {
    return;
  }

  try {
    const tokenInstruction = identifyTokenInstruction(instruction);

    if (tokenInstruction !== TokenInstruction.Transfer) {
      return null;
    }

    const { accounts, data } = parseTransferInstruction({
      ...instruction,
      data: Uint8Array.from(instruction.data), // Fixing the typings here to satisfy parseTransferInstruction()
    });
    const tokenMint = await getTokenMintFromAccountInfo(provider, accounts.source.address);

    if (!tokenMint) {
      return null;
    }

    const token = tokens.find((t) => t.address.toLowerCase() === tokenMint.toLowerCase());

    if (!token) {
      return null;
    }

    const isOutgoing = accounts.source.address === account || accounts.authority.address === account;
    const balanceChangeKey = isOutgoing === true ? 'outs' : 'ins';

    balanceChange[balanceChangeKey].push({
      token,
      items: [
        {
          displayValue: new TokenUnit(data.amount, token.decimals, '').toString(),
          usdPrice: undefined,
        },
      ],
    });

    return {
      title: `Transfer ${token.symbol}`,
      items: [addressItem('From', accounts.source.address), addressItem('To', accounts.destination.address)],
    };
  } catch {
    return null;
  }
};
