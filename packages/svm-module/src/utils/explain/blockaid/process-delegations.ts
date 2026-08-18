import type Blockaid from '@blockaid/client';
import type { DetailItem, DetailSection } from '@avalabs/vm-module-types';
import { addressItem, textItem } from '@internal/utils';

/**
 * Renders the delegations Blockaid reports for the signing account.
 *
 * The approval used to be built from `account_assets_diff` alone. A delegation moves no
 * balance at signing time, so it produces no diff entry and left no trace on the screen -
 * a transaction bundling a tiny transfer with an `ApproveChecked` showed only the transfer
 * while the wallet signed away spending authority over the rest of the balance. The
 * delegation is in the scan result and in the signed bytes; it simply was never rendered.
 *
 * Delegations are shown as their own section rather than folded into the balance change,
 * because "someone else may move this later" is a different statement from "this leaves your
 * account now", and collapsing the two is what made the omission easy to miss.
 */

type SolanaSimulation = Blockaid.Solana.Message.MessageScanResponse.Result.Simulation;
type AccountDelegation = SolanaSimulation['account_summary']['account_delegations'][number];

const getAssetLabel = (asset: AccountDelegation['asset']): string => {
  const symbol = 'symbol' in asset && asset.symbol ? asset.symbol : undefined;
  const name = 'name' in asset && asset.name ? asset.name : undefined;

  if (symbol && name && symbol !== name) {
    return `${name} (${symbol})`;
  }

  return symbol ?? name ?? asset.address;
};

export const processDelegations = (delegations: AccountDelegation[] = []): DetailSection[] => {
  if (delegations.length === 0) {
    return [];
  }

  return delegations.map((delegation, index) => {
    const items: DetailItem[] = [
      textItem('Token', getAssetLabel(delegation.asset), 'vertical'),
      textItem('Amount', String(delegation.delegation.value)),
      // The delegate is the address that gains the right to move the tokens.
      addressItem('Delegate', delegation.delegate),
    ];

    return {
      title: index === 0 ? 'Approvals Granted' : undefined,
      items,
    };
  });
};
