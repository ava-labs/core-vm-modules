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
import { addressItem, currencyItem, dataItem } from '@internal/utils';
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

    // Calculate network fee from SOL balance changes
    // For both native SOL and SPL token transfers, the network fee is always paid in SOL
    const accountAssetsDiff = simulation.account_summary.account_assets_diff;

    if (accountAssetsDiff && accountAssetsDiff.length > 0) {
      // Find the SOL asset in the account summary
      const solAsset = accountAssetsDiff.find((asset) => asset.asset.type === 'SOL');

      if (solAsset) {
        let feeAmount = 0;

        // Check transaction type based on asset movements
        const tokenAssets = accountAssetsDiff.filter((asset) => asset.asset.type === 'TOKEN');
        const outgoingAssets = accountAssetsDiff.filter((asset) => asset.out && asset.out.raw_value > 0);
        const incomingAssets = accountAssetsDiff.filter((asset) => asset.in && asset.in.raw_value > 0);

        // SOL transfers: only SOL involved, only SOL going out
        const isSolTransfer = tokenAssets.length === 0 && solAsset && outgoingAssets.length === 1;

        // SPL transfers: 1 token going out + SOL going out (for fee), no tokens coming in
        const isSplTransfer =
          tokenAssets.length === 1 && solAsset && outgoingAssets.length === 2 && incomingAssets.length === 0;

        // Only calculate fees for transfers (not swaps)
        if (isSolTransfer || isSplTransfer) {
          if (isSolTransfer) {
            // For SOL transfers, calculate fee by looking at the difference between sent and received amounts
            const assetsDiff = simulation.assets_diff;
            const accountAddress = params.account;

            if (assetsDiff && assetsDiff[accountAddress]) {
              const accountChanges = assetsDiff[accountAddress];
              const solChange = accountChanges.find((change) => change.asset.type === 'SOL');

              if (solChange && solChange.out) {
                const sentAmount = solChange.out.raw_value;

                // Look for the corresponding receiver to calculate the actual transfer amount
                const allAddresses = Object.keys(assetsDiff);
                let receivedAmount = 0;

                for (const address of allAddresses) {
                  if (address !== accountAddress) {
                    const otherChanges = assetsDiff[address];
                    if (otherChanges) {
                      const otherSolChange = otherChanges.find((change) => change.asset.type === 'SOL');
                      if (otherSolChange && otherSolChange.in) {
                        receivedAmount = otherSolChange.in.raw_value;
                        break;
                      }
                    }
                  }
                }

                // Calculate fee as the difference
                if (receivedAmount > 0) {
                  feeAmount = sentAmount - receivedAmount;
                }
              }
            }
          } else if (isSplTransfer) {
            // For SPL transfers, use standard Solana fee (no SOL recipient)
            feeAmount = 5000; // Standard Solana network fee
          }

          // Validate that this looks like a reasonable fee
          if (feeAmount > 0 && feeAmount <= 10000) {
            // 0.00001 SOL max
            // Fee is valid, keep it
          } else {
            feeAmount = 0;
          }
        }

        // Only add fee section if there's an actual fee to display
        if (feeAmount > 0) {
          details.push({
            title: 'Network Fee',
            items: [
              currencyItem('Fee Amount', BigInt(feeAmount), network.networkToken.decimals, network.networkToken.symbol),
            ],
          });
        }
      }
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
