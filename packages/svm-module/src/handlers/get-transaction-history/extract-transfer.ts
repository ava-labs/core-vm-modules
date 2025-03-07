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

    if (netChange <= 0n) {
      return acc;
    }

    // Find sender (the one whose balance decreased)
    const sender = Object.keys(preBalances).find((k) => {
      const [possibleSender, mintFromPreBalance] = k.split('-');
      const possibleSenderPostBalance = meta.postTokenBalances.find(
        ({ owner: postBalanceOwner, mint: postBalanceMint }) =>
          postBalanceOwner === possibleSender && postBalanceMint === mint,
      );

      return (
        mintFromPreBalance === mint && possibleSenderPostBalance && preBalances[k]! > possibleSenderPostBalance.amount
      );
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
  }, [] as TxToken[]);

  const nativeTransfer = extractNativeTransfer(addresses, accountIndex, meta, network);

  if (nativeTransfer) {
    transfers.push(nativeTransfer);
  }

  return transfers;
};

const extractNativeTransfer: ExtractTransferFn<'native'> = (
  addresses,
  accountIndex,
  { paidFee, preBalances, postBalances },
  network,
) => {
  const address = addresses[accountIndex]!;
  const nativeBalancePre = preBalances[accountIndex]!;
  const nativeBalancePost = postBalances[accountIndex]!;
  const nativeTransferAmount =
    nativeBalancePost !== nativeBalancePre ? nativeBalancePost - nativeBalancePre + paidFee : 0;
  const balanceDiffs = postBalances.map((b, i) => b - preBalances[i]!);

  if (!nativeTransferAmount) {
    return null;
  }

  const isIncoming = nativeTransferAmount > 0;
  const unit = new TokenUnit(Math.abs(nativeTransferAmount), network.networkToken.decimals, '');
  // If it's an incoming transaction, we assume it came from the transaction signer.
  // It it's an outgoing transaction, we need to find the address that received this exact amount (minus the fee).
  const otherAddressIndex = isIncoming
    ? 0
    : Math.max(
        0,
        balanceDiffs.findIndex((diff) => diff === -nativeTransferAmount),
      );

  return {
    amount: unit.toDisplay(),
    from: {
      address: isIncoming ? addresses[otherAddressIndex]! : address,
    },
    to: {
      address: isIncoming ? address : addresses[otherAddressIndex]!,
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
