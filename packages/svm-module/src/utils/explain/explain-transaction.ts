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
      // If there is one other affected address, we label the user's address as "From" and the other address as "To".
      // If there are more than 1 affected addresses, we label the user's address as "Account" and the others as "Interacting with".
      genericDetails.items.push(addressItem(otherAffectedAddresses.length === 1 ? 'From' : 'Account', params.account));
      genericDetails.items.push(
        otherAffectedAddresses.length === 1
          ? addressItem('To', otherAffectedAddresses[0]!)
          : addressListItem('Interacting with', otherAffectedAddresses),
      );
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
        
        // Check if this is a swap (multiple tokens involved)
        const tokenAssets = accountAssetsDiff.filter(asset => asset.asset.type === 'TOKEN');
        const isSwap = tokenAssets.length > 1;
  
        
        // Only calculate fees for non-swap transactions
        if (!isSwap) {
          if (solAsset.out && solAsset.out.raw_value > 0) {
            // If SOL is going out, check if it's a reasonable fee amount
            const outAmount = solAsset.out.raw_value;
            // Solana fees are typically around 5000 lamports (0.000005 SOL)
            if (outAmount <= 10000) { // 0.00001 SOL threshold
              feeAmount = outAmount;
            }
          }
        }
        
        // Only add fee section if there's an actual fee to display
        if (feeAmount > 0) {
          details.push({
            title: 'Network Fee',
            items: [
              currencyItem(
                'Fee Amount',
                BigInt(feeAmount),
                network.networkToken.decimals,
                network.networkToken.symbol,
              ),
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
