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

  const nativeTransfer = extractNativeTransfer(addresses, accountIndex, meta, network, transfers);

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
) => {
  // For ATA transactions (accountIndex = -1), we don't have native transfers
  if (accountIndex === -1) {
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
    if (largestGainer.amount > paidFee * 2) {
      nativeTransferAmount = largestGainer.amount;
      isIncoming = true;
      counterpartyIndex = largestGainer.index;
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

  return {
    amount: unit.toDisplay(),
    from: {
      address: isIncoming ? addresses[counterpartyIndex]! : address,
    },
    to: {
      address: isIncoming ? address : addresses[counterpartyIndex]!,
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
