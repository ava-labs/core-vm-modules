import {
  AlertType,
  RpcMethod,
  type Alert,
  type BalanceChange,
  type TokenApprovals,
  type TokenDiff,
  type TransactionSimulationResult,
} from '@avalabs/vm-module-types';
import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';

import type { TransactionBatchParams, TransactionParams } from '../../../types';
import { isEmpty, isNetworkToken } from '../../../utils/type-utils';
import { processTransactionSimulation } from '../../../utils/process-transaction-simulation';
import { scanTransactionBatch } from '../../../utils/scan-transaction';
import { transactionAlerts } from '../../../utils/transaction-alerts';

export const simulateTransactionBatch = async ({
  rpcMethod,
  dAppUrl,
  params,
  chainId,
  proxyApiUrl,
  provider,
  populateMissingGas,
}: {
  rpcMethod: RpcMethod;
  dAppUrl?: string;
  params: TransactionBatchParams;
  chainId: number;
  proxyApiUrl: string;
  provider: JsonRpcBatchInternal;
  populateMissingGas?: boolean;
}): Promise<
  TransactionSimulationResult & { scans: (TransactionSimulationResult & { transaction: TransactionParams })[] }
> => {
  let simulationResults;

  try {
    simulationResults = await scanTransactionBatch({
      proxyApiUrl,
      chainId,
      params,
      domain: dAppUrl,
      withGasEstimation: populateMissingGas,
    });
  } catch (error) {
    console.error('simulateTransactionBatch error', error);
    return {
      isSimulationSuccessful: false,
      alert: transactionAlerts[AlertType.WARNING],
      scans: [],
    };
  }

  const scans = await Promise.all(
    simulationResults.map(async (simulationResult, index) => {
      const matchingTx = params[index]!;
      const processedResult = await processTransactionSimulation({
        chainId,
        params: params[index]!,
        provider,
        rpcMethod,
        simulationResult,
      });

      if (populateMissingGas && !matchingTx.gas && processedResult.estimatedGasLimit) {
        matchingTx.gas = `0x${processedResult.estimatedGasLimit.toString(16)}`;
      }

      return {
        transaction: matchingTx,
        ...processedResult,
      };
    }),
  );

  // Make sure `isSimulatioSuccessful` is only true for a batch if all nested transactions were simulated successfully
  const isSimulationSuccessful = scans.every((scan) => scan.isSimulationSuccessful);
  // Make sure the alert in the aggregated view is of the upmost priority (DANGER -> WARNING -> INFO)
  const alert = getHighestAlert(scans);
  const balanceChange = aggregateBalanceChange(scans);
  const tokenApprovals = aggregateTokenApprovals(scans);

  return {
    isSimulationSuccessful,
    alert,
    balanceChange,
    tokenApprovals,
    // For now, we're disabling the editing of approvals in the aggregated view since
    // it could disrupt the execution of the entire batch.
    scans: scans.map((scan) => {
      if (!scan.tokenApprovals) {
        return scan;
      }

      scan.tokenApprovals.isEditable = false;
      return scan;
    }),
  };
};

const getHighestAlert = (scans: { alert?: Alert }[]): Alert | undefined => {
  const alertPrio = {
    [AlertType.INFO]: 0,
    [AlertType.WARNING]: 1,
    [AlertType.DANGER]: 2,
  };

  return scans.reduce(
    (highest, { alert }) => {
      if (!alert) return highest;
      if (!highest || alertPrio[alert.type] > alertPrio[highest.type]) {
        return alert;
      }
      return highest;
    },
    undefined as Alert | undefined,
  );
};

const aggregateTokenApprovals = (scans: TransactionSimulationResult[]): TokenApprovals | undefined => {
  const tokenApprovals = scans.reduce(
    (aggregatedTokenApprovals, { tokenApprovals }) => {
      if (!tokenApprovals) {
        return aggregatedTokenApprovals;
      }

      tokenApprovals.approvals.forEach((appr) => {
        const aggregatedApproval = aggregatedTokenApprovals.approvals.find(
          (aggrApproval) =>
            appr.token.address === aggrApproval.token.address && appr.spenderAddress === aggrApproval.spenderAddress,
        );

        if (!aggregatedApproval) {
          aggregatedTokenApprovals.approvals.push({ ...appr });
          return;
        }

        // Replace with new values
        aggregatedApproval.value = appr.value;
        aggregatedApproval.usdPrice = appr.usdPrice;
      });

      return aggregatedTokenApprovals;
    },
    {
      approvals: [],
      isEditable: false,
    } as TokenApprovals,
  );

  clearSpentApprovals(tokenApprovals, scans);

  return isEmpty(tokenApprovals) ? undefined : tokenApprovals;
};

const aggregateBalanceChange = (scans: TransactionSimulationResult[]): BalanceChange | undefined => {
  const aggregated = scans.reduce(
    (aggregatedBalanceChange, { balanceChange }) => {
      if (!balanceChange) {
        return aggregatedBalanceChange;
      }

      balanceChange.ins.forEach((diff) => {
        const aggregatedDiff = findTokenDiff(aggregatedBalanceChange.ins, diff);

        if (aggregatedDiff) {
          aggregatedDiff.items.push(...diff.items);
        } else {
          aggregatedBalanceChange.ins.push(diff);
        }
      });

      balanceChange.outs.forEach((diff) => {
        const aggregatedDiff = findTokenDiff(aggregatedBalanceChange.outs, diff);

        if (aggregatedDiff) {
          aggregatedDiff.items.push(...diff.items);
        } else {
          aggregatedBalanceChange.outs.push({ ...diff });
        }
      });

      return aggregatedBalanceChange;
    },
    {
      ins: [],
      outs: [],
    } as BalanceChange,
  );

  return isEmpty(aggregated) ? undefined : aggregated;
};

const findTokenDiff = (diffs: TokenDiff[], lookupDiff: TokenDiff): TokenDiff | undefined =>
  diffs.find((diff) => {
    if (isNetworkToken(diff.token) && isNetworkToken(lookupDiff.token)) {
      return diff.token.symbol === lookupDiff.token.symbol;
    }

    if (!isNetworkToken(diff.token) && !isNetworkToken(lookupDiff.token)) {
      return diff.token.address === lookupDiff.token.address;
    }

    return false;
  });

const clearSpentApprovals = (tokenApprovals: TokenApprovals, scans: TransactionSimulationResult[]) => {
  // Go through each transaction. If the approvals were spent, remove them from the aggregated token approvals:
  for (const approval of tokenApprovals.approvals) {
    for (const scan of scans) {
      if (!scan.isSimulationSuccessful || !scan.balanceChange) {
        continue;
      }

      const touchesApproval = scan.balanceChange.outs.some((diff) => {
        return (
          !isNetworkToken(diff.token) &&
          !isNetworkToken(approval.token) &&
          diff.token.address === approval.token.address
        );
      });

      if (!touchesApproval) {
        continue;
      }

      if (!scan.tokenApprovals) {
        // Allowance was completely spent, remove the approval from aggregated view
        //
        // NOTE: With the current implementation of the BlockAid API, this is just an assumption on our part!
        // It's possible that the next transaction simply does not touch the approval at all.
        // Since we're initially be using this handler for the Swap feature, though, most of the time the allowance
        // will be spent completely.
        //
        // The BlockAid team is working to update their API to provide more accurate data.
        tokenApprovals.approvals = tokenApprovals.approvals.filter(
          (appr) => appr.spenderAddress !== approval.spenderAddress && approval.token.address !== appr.token.address,
        );
      } else {
        const latestApprovalState = scan.tokenApprovals.approvals.find(
          (appr) => appr.spenderAddress === approval.spenderAddress && appr.token.address === approval.token.address,
        );

        if (!latestApprovalState) {
          continue;
        }
        approval.usdPrice = latestApprovalState.usdPrice;
        approval.value = latestApprovalState.value;
      }
    }
  }
};
