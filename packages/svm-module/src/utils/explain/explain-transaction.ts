import {
  AlertType,
  type Alert,
  type BalanceChange,
  type DetailSection,
  type Network,
  type TransactionSimulationResult,
} from '@avalabs/vm-module-types';

import type { getProvider } from '../get-provider';
import { getAlertForError, transactionAlerts } from '../transaction-alerts';

import type { ExplainTxParams } from './types';
import { parseTransaction } from './parse-transaction';
import { processBalanceChange } from './blockaid/process-balance-change';
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
  const { simulation, validation } = scanResponse?.result ?? {};
  const genericDetails: DetailSection = {
    title: 'Transaction Details',
    items: [dataItem('Raw Data', simulationParams.params.transactionBase64)],
  };
  const details: DetailSection[] = [genericDetails];

  let isSimulationSuccessful = false;
  let balanceChange: BalanceChange | undefined;
  let alert: Alert | undefined;

  if (!validation || validation.result_type === 'Warning') {
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
