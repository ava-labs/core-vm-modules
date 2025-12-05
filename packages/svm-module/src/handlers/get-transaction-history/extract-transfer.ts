import { TokenUnit } from '@avalabs/core-utils-sdk';
import { TokenType, type Network, type SPLToken, type TxToken } from '@avalabs/vm-module-types';
import type { TokenBalance } from '@solana/kit';

export const simplifyTokenBalance = (balance: TokenBalance): SimpleTokenBalance => ({
  mint: balance.mint as string,
  owner: balance.owner as string,
  amount: BigInt(balance.uiTokenAmount.amount),
  decimals: balance.uiTokenAmount.decimals,
});

export const extractTokenTranfers: ExtractTransferFn<'SPL'> = (addresses, accountIndex, meta, network): TxToken[] => {
  // For ATA transactions (accountIndex = -1), find our address from token balances
  const ourAddress =
    accountIndex !== -1
      ? addresses[accountIndex]
      : meta.preTokenBalances.find((balance) => !addresses.includes(balance.owner))?.owner ||
        meta.postTokenBalances.find((balance) => !addresses.includes(balance.owner))?.owner;

  // Create a map of initial balances
  const preBalances: Record<string, bigint> = meta.preTokenBalances.reduce(
    (acc, { owner, mint, amount }) => ({
      ...acc,
      [`${owner}-${mint}`]: amount,
    }),
    {},
  );

  // Compare with post balances to determine transfers
  const transfers = meta.postTokenBalances.reduce((acc, { owner, mint, amount, decimals }) => {
    const key = `${owner}-${mint}`;
    const preAmount = preBalances[key] ?? 0n;
    const netChange = amount - preAmount;

    // Skip if no balance change
    if (netChange === 0n) {
      return acc;
    }

    // Determine if this is a receive or send based on balance change
    const isReceive = netChange > 0n && owner === ourAddress;
    const isSend = netChange < 0n && owner === ourAddress;

    if (isReceive) {
      // For receives, we need to find who sent it

      // For receives, find the sender by looking for addresses that had the token before but not after (or decreased)
      const sender = Object.keys(preBalances).find((k) => {
        const [possibleSender, mintFromPreBalance] = k.split('-');

        // Skip if it's not the same mint
        if (mintFromPreBalance !== mint) return false;

        // Skip if it's our address
        if (possibleSender === ourAddress) return false;

        // Check if this address had a balance before but not after (or decreased)
        const preBalance = preBalances[k]!;
        const postBalance = meta.postTokenBalances.find(
          ({ owner, mint: postMint }) => owner === possibleSender && postMint === mint,
        );

        // If no post balance, or balance decreased, this is likely the sender
        const isSender = !postBalance || postBalance.amount < preBalance;

        return isSender;
      });

      if (!sender) {
        return acc;
      }

      const token =
        network.tokens?.filter((t): t is SPLToken => 'contractType' in t).find((t) => t.address === mint) ??
        ({
          contractType: TokenType.SPL,
          decimals,
          address: mint,
          symbol: 'Unknown',
          name: 'Unknown',
        } as SPLToken);

      const transfer: TxToken = {
        ...token,
        type: token.contractType,
        from: {
          ...token,
          address: sender.split('-')[0]!,
        },
        to: {
          ...token,
          address: owner,
        },
        amount: new TokenUnit(netChange, decimals, '').toDisplay(),
      };

      return [...acc, transfer];
    } else if (isSend) {
      // For sends, we need to find who received it

      const recipient = meta.postTokenBalances.find(
        ({ owner: postBalanceOwner, mint: postBalanceMint }) =>
          postBalanceMint === mint &&
          postBalanceOwner !== ourAddress &&
          (preBalances[`${postBalanceOwner}-${mint}`] ?? 0n) <
            (meta.postTokenBalances.find((p) => p.owner === postBalanceOwner && p.mint === mint)?.amount ?? 0n),
      );

      if (!recipient) {
        return acc;
      }

      const token =
        network.tokens?.filter((t): t is SPLToken => 'contractType' in t).find((t) => t.address === mint) ??
        ({
          contractType: TokenType.SPL,
          decimals,
          address: mint,
          symbol: 'Unknown',
          name: 'Unknown',
        } as SPLToken);

      const transfer: TxToken = {
        ...token,
        type: token.contractType,
        from: {
          ...token,
          address: ourAddress!,
        },
        to: {
          ...token,
          address: recipient.owner,
        },
        amount: new TokenUnit(-netChange, decimals, '').toDisplay(), // Make positive for display
      };

      return [...acc, transfer];
    }

    // Skip if not our transaction
    return acc;
  }, [] as TxToken[]);

  const nativeTransfer = extractNativeTransfer(addresses, accountIndex, meta, network, transfers, ourAddress);

  if (nativeTransfer) {
    transfers.push(nativeTransfer);
  }

  return transfers;
};

const extractNativeTransfer = (
  addresses: string[],
  accountIndex: number,
  { paidFee, preBalances, postBalances }: { paidFee: number; preBalances: number[]; postBalances: number[] },
  network: Network,
  splTransfers: TxToken[] = [],
  ourAddress?: string,
): TxToken | null => {
  // For ATA transactions (accountIndex = -1), check if this might be a SOL → SPL swap
  if (accountIndex === -1) {
    // Only create SOL transfers for ATA transactions if:
    // 1. We have SPL transfers (swap context)
    // 2. We received SPL tokens (indicating we might have spent SOL)
    // 3. There's significant SOL movement in the transaction
    if (splTransfers.length > 0 && ourAddress) {
      const receivedSPL = splTransfers.some((transfer) => transfer.to?.address === ourAddress);

      if (receivedSPL) {
        // Find our address in the addresses array to get balance changes
        const ourAccountIndex = addresses.findIndex((addr) => addr === ourAddress);

        if (ourAccountIndex !== -1) {
          // We found our address - check if we spent SOL
          const nativeBalancePre = preBalances[ourAccountIndex]!;
          const nativeBalancePost = postBalances[ourAccountIndex]!;
          const rawBalanceChange = nativeBalancePost - nativeBalancePre;

          // If we spent SOL (including fees), create a SOL transfer for the swap
          if (rawBalanceChange <= 0) {
            const solSpent = Math.abs(rawBalanceChange) + paidFee;

            // Only create transfer if we spent a meaningful amount
            if (solSpent > paidFee) {
              const unit = new TokenUnit(solSpent, network.networkToken.decimals, '');

              // Find who received the most SOL (likely the program/pool)
              const balanceDiffs = postBalances.map((b, i) => b - preBalances[i]!);
              const largestSOLRecipient = balanceDiffs.reduce(
                (max, diff, i) => {
                  if (i !== ourAccountIndex && diff > max.amount && diff > 0) {
                    return { index: i, amount: diff };
                  }
                  return max;
                },
                { index: 0, amount: 0 },
              );

              return {
                amount: unit.toDisplay(),
                from: {
                  address: ourAddress,
                },
                to: {
                  address: addresses[largestSOLRecipient.index]!,
                },
                name: network.networkToken.name,
                symbol: network.networkToken.symbol,
                type: TokenType.NATIVE,
              };
            }
          }
        }
      }
    }

    return null;
  }

  const address = addresses[accountIndex]!;
  const nativeBalancePre = preBalances[accountIndex]!;
  const nativeBalancePost = postBalances[accountIndex]!;
  const rawBalanceChange = nativeBalancePost - nativeBalancePre;
  const balanceDiffs = postBalances.map((b, i) => b - preBalances[i]!);

  // Detect if we're in a swap context (SPL transfers present)
  const isSwapContext = splTransfers.length > 0;

  let nativeTransferAmount = rawBalanceChange !== 0 ? rawBalanceChange + paidFee : 0;
  let isIncoming = nativeTransferAmount > 0;
  let counterpartyIndex = 0;

  // Special case: For SOL → SPL swaps, we need to flip the SOL transfer direction
  // This happens when accountIndex=0 creates an incoming SOL transfer, but we actually spent SOL
  let isSOLtoSPLSwap = false;
  if (isSwapContext && accountIndex === 0 && ourAddress) {
    const receivedSPL = splTransfers.some((transfer) => transfer.to?.address === ourAddress);
    const sentSPL = splTransfers.some((transfer) => transfer.from?.address === ourAddress);

    // If we received SPL tokens but didn't send any, this is likely a SOL → SPL swap
    // The SOL transfer should be outgoing (we spent SOL to get SPL)
    if (receivedSPL && !sentSPL) {
      isIncoming = false; // Change from incoming to outgoing
      isSOLtoSPLSwap = true; // Flag to prevent override later
      // Find who received the most SOL (likely the program/pool)
      const balanceDiffs = postBalances.map((b, i) => b - preBalances[i]!);
      const largestSOLRecipient = balanceDiffs.reduce(
        (max, diff, i) => {
          if (i !== accountIndex && diff > max.amount && diff > 0) {
            return { index: i, amount: diff };
          }
          return max;
        },
        { index: 0, amount: 0 },
      );
      counterpartyIndex = largestSOLRecipient.index;
    }
  }

  if (isSwapContext && rawBalanceChange < 0) {
    // In a swap, if our balance decreased, look for who gained the most SOL
    // This person likely sent us SOL in the swap
    const largestGainer = balanceDiffs.reduce(
      (max, diff, i) => {
        if (i !== accountIndex && diff > max.amount) {
          return { index: i, amount: diff };
        }
        return max;
      },
      { index: 0, amount: 0 },
    );

    // If someone gained significant SOL (more than just fees), we likely received SOL from them
    // BUT don't override if we already detected a SOL → SPL swap
    if (largestGainer.amount > paidFee * 2 && !isSOLtoSPLSwap) {
      nativeTransferAmount = largestGainer.amount;
      isIncoming = true;
      counterpartyIndex = largestGainer.index;
    }
  } else if (isSwapContext && rawBalanceChange <= 0) {
    // Handle SOL → SPL swaps where we spent SOL to get SPL tokens
    // Check if we received SPL tokens (indicating a swap, not just a send)
    const receivedSPL = splTransfers.some((transfer) => transfer.to?.address === address);

    if (receivedSPL) {
      // We spent SOL to get SPL tokens - this is a swap
      // Show the SOL we spent (including fees for the total cost)
      nativeTransferAmount = Math.abs(rawBalanceChange) + paidFee;
      isIncoming = false;

      // Find who received the most SOL (likely the program/pool)
      const largestSOLRecipient = balanceDiffs.reduce(
        (max, diff, i) => {
          if (i !== accountIndex && diff > max.amount && diff > 0) {
            return { index: i, amount: diff };
          }
          return max;
        },
        { index: 0, amount: 0 },
      );

      counterpartyIndex = largestSOLRecipient.index;
    }
  }

  if (!nativeTransferAmount) {
    return null;
  }

  const unit = new TokenUnit(Math.abs(nativeTransferAmount), network.networkToken.decimals, '');

  // For non-swap context, use the original logic
  if (!isSwapContext) {
    const largestBeneficiary = balanceDiffs.reduce(
      ({ index, change }, netChange, i) => {
        if (netChange > change) {
          return { index: i, change: netChange };
        }
        return { index, change };
      },
      { index: 0, change: balanceDiffs[0]! },
    );
    counterpartyIndex = isIncoming ? 0 : largestBeneficiary.index;
  }

  // For SOL → SPL swaps, use ourAddress instead of addresses[accountIndex]
  // Handle case where counterpartyIndex is out of bounds
  const counterpartyAddress = addresses[counterpartyIndex];
  const fromAddress = isIncoming ? counterpartyAddress || address : ourAddress || address;
  const toAddress = isIncoming ? ourAddress || address : counterpartyAddress || ourAddress || address;

  return {
    amount: unit.toDisplay(),
    from: {
      address: fromAddress,
    },
    to: {
      address: toAddress,
    },
    name: network.networkToken.name,
    symbol: network.networkToken.symbol,
    type: TokenType.NATIVE,
  };
};

type SimpleTokenBalance = {
  mint: string;
  owner: string;
  amount: bigint;
  decimals: number;
};

type TxMeta = {
  paidFee: number;
  // Native SOL balances
  preBalances: number[];
  postBalances: number[];
  // SPL tokens balances
  preTokenBalances: SimpleTokenBalance[];
  postTokenBalances: SimpleTokenBalance[];
};

type ExtractTransferFn<Type extends 'native' | 'SPL'> = (
  addresses: string[],
  accountIndex: number,
  meta: TxMeta,
  network: Network,
) => Type extends 'native' ? TxToken | null : TxToken[];
