import {
  AlertType,
  type Alert,
  type BalanceChange,
  type DetailSection,
  type Network,
  type TransactionSimulationResult,
} from '@avalabs/vm-module-types';

import type { getProvider } from '../get-provider';
import { getAlertForError, transactionAlerts, wrongClusterAlert } from '../transaction-alerts';
import { isTransactionLifetimeOnCluster } from '../verify-transaction-lifetime';

import type { ExplainTxParams } from './types';
import { parseTransaction } from './parse-transaction';
import { processBalanceChange } from './blockaid/process-balance-change';
import { processDelegations } from './blockaid/process-delegations';
import { scanSolanaTransaction } from './blockaid/scan-solana-transaction';
import { addressItem, dataItem } from '@internal/utils';
import { addressListItem } from '@internal/utils/src/utils/detail-item';

export const explainTransaction = async ({
  simulationParams,
  network,
  provider,
}: {
  simulationParams: ExplainTxParams;
  network: Network;
  provider: ReturnType<typeof getProvider>;
}): Promise<TransactionSimulationResult & { details: DetailSection[] }> => {
  const { params } = simulationParams;
  const scanResponse = await scanSolanaTransaction(simulationParams);
  const { simulation: rawSimulation, validation } = scanResponse?.result ?? {};
  // A failed Blockaid simulation still comes back as a (truthy) object - e.g.
  // `{ status: 'Error', error, error_details }` - but without an `account_summary`.
  // Only treat it as a usable simulation when that data is actually present,
  // otherwise we fall back to manual parsing instead of crashing.
  const simulation = rawSimulation?.account_summary ? rawSimulation : undefined;
  const genericDetails: DetailSection = {
    title: 'Transaction Details',
    items: [dataItem('Raw Data', simulationParams.params.transactionBase64)],
  };
  const details: DetailSection[] = [genericDetails];

  let isSimulationSuccessful = false;
  let balanceChange: BalanceChange | undefined;
  let alert: Alert | undefined;

  // A Solana message has no chain id - its blockhash (or nonce account) is the only thing
  // tying it to one cluster, and nothing used to check it against the cluster on screen.
  const isOnThisCluster = await isTransactionLifetimeOnCluster(params.transactionBase64, provider);

  if (isOnThisCluster === false) {
    alert = wrongClusterAlert(network.chainName);
  } else if (!validation || validation.result_type === 'Warning') {
    alert = transactionAlerts[AlertType.WARNING];
  } else if (validation.result_type === 'Malicious') {
    alert = transactionAlerts[AlertType.DANGER];
  } else if (scanResponse?.error_details) {
    alert = getAlertForError(scanResponse.error_details);
  }

  if (simulation) {
    const { balanceChange: processedBalanceChange, otherAffectedAddresses } = processBalanceChange(
      params.account,
      simulation,
      network,
    );
    balanceChange = processedBalanceChange;
    if (otherAffectedAddresses.length > 0) {
      // Check if this is a swap (multiple tokens involved)
      const accountAssetsDiff = simulation.account_summary.account_assets_diff;
      const outgoingAssets = accountAssetsDiff?.filter((asset) => asset.out && asset.out.raw_value > 0) ?? [];
      const incomingAssets = accountAssetsDiff?.filter((asset) => asset.in && asset.in.raw_value > 0) ?? [];

      // Swaps: multiple assets changing hands (both outgoing and incoming)
      const isSwap = outgoingAssets.length > 0 && incomingAssets.length > 0;

      // For swaps, always show "Interacting with" regardless of address count
      // For transfers, use the existing logic
      if (isSwap) {
        genericDetails.items.push(addressItem('Account', params.account));
        genericDetails.items.push(addressListItem('Interacting with', otherAffectedAddresses));
      } else {
        // Original logic for transfers
        genericDetails.items.push(
          addressItem(otherAffectedAddresses.length === 1 ? 'From' : 'Account', params.account),
        );
        genericDetails.items.push(
          otherAffectedAddresses.length === 1
            ? addressItem('To', otherAffectedAddresses[0]!)
            : addressListItem('Interacting with', otherAffectedAddresses), // handle contract transfers
        );
      }
    } else {
      // Make sure to always show the user's address in the details.
      genericDetails.items.push(addressItem('Account', params.account));
    }

    // A delegation moves no balance at signing time, so it never appears in the asset diffs
    // the section above is built from. It is in the scan result and in the signed bytes, and
    // it hands spending authority to somebody else - it has to be on the screen.
    details.push(...processDelegations(simulation.account_summary.account_delegations));

    isSimulationSuccessful = true;
  } else {
    // If Blockaid simulation fails, we fall back to parsing the transaction manually.
    const { balanceChange: parsedBalanceChange, details: parsedDetails } = await parseTransaction(
      params.transactionBase64,
      params.account,
      network,
      provider,
    );
    balanceChange = parsedBalanceChange;
    details.push(...parsedDetails);
  }

  return {
    isSimulationSuccessful,
    details,
    alert,
    balanceChange,
  };
};
