import Blockaid from '@blockaid/client';
import type { TransactionParams } from '../types';
import {
  type NetworkContractToken,
  type NetworkToken,
  TokenType,
  AlertType,
  type Alert,
  type BalanceChange,
  type TokenApproval,
  type TokenDiff,
  type TokenDiffItem,
  type TokenApprovals,
  type RpcRequest,
  RpcMethod,
  type TransactionSimulationResult,
} from '@avalabs/vm-module-types';
import { balanceToDisplayValue, numberToBN } from '@avalabs/core-utils-sdk';
import { isHexString } from 'ethers';
import { scanJsonRpc, scanTransaction } from './scan-transaction';
import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import { parseWithErc20Abi } from './parse-erc20-tx';
import { hasToField } from './type-utils';
import { transactionAlerts } from './transaction-alerts';

type TokenDetail = { asset: { address: string } };
type ExposureTrace = Blockaid.Evm.TransactionSimulation.AccountSummary.Erc20ExposureTrace & TokenDetail;
type Trace = Blockaid.Evm.TransactionSimulation.AccountSummary['traces']['0'];
export type AssetDiffs = Blockaid.Evm.TransactionSimulation.AccountSummary['assets_diffs'];

export const simulateTransaction = async ({
  rpcMethod,
  dAppUrl,
  params,
  chainId,
  provider,
  proxyApiUrl,
}: {
  rpcMethod: RpcMethod;
  dAppUrl?: string;
  params: TransactionParams;
  chainId: number;
  provider: JsonRpcBatchInternal;
  proxyApiUrl: string;
}) => {
  let simulationResult: Pick<Blockaid.TransactionScanResponse, 'simulation' | 'validation'> | undefined;

  try {
    simulationResult = await scanTransaction({
      proxyApiUrl,
      chainId,
      params,
      domain: dAppUrl,
    });
  } catch (error) {
    console.error('simulateTransaction error', error);
  }

  return processTransactionSimulation({ rpcMethod, params, chainId, provider, simulationResult });
};

export const processTransactionSimulation = async ({
  rpcMethod,
  params,
  chainId,
  provider,
  simulationResult,
}: {
  rpcMethod: RpcMethod;
  params: TransactionParams;
  chainId: number;
  provider: JsonRpcBatchInternal;
  simulationResult?: Pick<Blockaid.TransactionScanResponse, 'simulation' | 'validation' | 'gas_estimation'>;
}): Promise<TransactionSimulationResult> => {
  let alert: Alert | undefined;
  let balanceChange: BalanceChange | undefined;
  let tokenApprovals: TokenApprovals | undefined;
  let isSimulationSuccessful = false;
  let estimatedGasLimit: number | undefined;

  if (simulationResult) {
    const { validation, simulation, gas_estimation: gasEstimation } = simulationResult;

    if (!validation || validation.result_type === 'Error' || validation.result_type === 'Warning') {
      alert = transactionAlerts[AlertType.WARNING];
    } else if (validation.result_type === 'Malicious') {
      alert = transactionAlerts[AlertType.DANGER];
    }

    if (simulation?.status === 'Success') {
      isSimulationSuccessful = true;
      tokenApprovals = processTokenApprovals(rpcMethod, simulation.account_summary);
      balanceChange = processBalanceChange(simulation.account_summary.assets_diffs);
    }

    if (gasEstimation?.status === 'Success') {
      estimatedGasLimit = Number(gasEstimation.estimate);
    }
  }

  // If debank parsing failed, check if toAddress is a known ERC20
  if (!isSimulationSuccessful && hasToField(params)) {
    const erc20ParseResult = await parseWithErc20Abi(params, chainId, provider);
    balanceChange = erc20ParseResult.balanceChange;
    tokenApprovals = erc20ParseResult.tokenApprovals;
  }

  return { alert, balanceChange, tokenApprovals, isSimulationSuccessful, estimatedGasLimit };
};

const isExposureTrace = (trace: Trace): trace is ExposureTrace => {
  return (trace as ExposureTrace).trace_type !== undefined;
};

const mapExposureTracesToSpenderAsset = (traces: Trace[]): Record<string, ExposureTrace> => {
  return traces.reduce(
    (accumulator, trace) => {
      if (!isExposureTrace(trace)) {
        return accumulator;
      }
      return {
        [`${trace.spender}.${trace.asset.address}`]: trace,
      };
    },
    {} as Record<string, ExposureTrace>,
  );
};

const processTokenApprovals = (
  rpcMethod: RpcMethod,
  accountSummary: Blockaid.Evm.TransactionSimulation.AccountSummary,
): TokenApprovals | undefined => {
  const { exposures, traces } = accountSummary;

  const mappedTraces = mapExposureTracesToSpenderAsset(traces);

  const approvals: TokenApproval[] = [];

  for (const exposurePerAsset of exposures) {
    const token = convertAssetToNetworkContractToken(exposurePerAsset.asset);
    if (!token) {
      continue;
    }

    for (const [spenderAddress, exposurePerSpender] of Object.entries(exposurePerAsset.spenders)) {
      if (exposurePerSpender.exposure.length === 0) {
        approvals.push({
          token,
          spenderAddress,
          logoUri: token.logoUri,
        });
      } else {
        for (const exposure of exposurePerSpender.exposure) {
          if ('raw_value' in exposure) {
            const traceForExposure = mappedTraces[`${spenderAddress}.${token.address}`];
            approvals.push({
              token,
              spenderAddress,
              value: traceForExposure?.exposed.raw_value ?? exposure.raw_value,
              usdPrice: traceForExposure?.exposed?.usd_price ?? exposure.usd_price,
              logoUri: token.logoUri,
            });
          } else {
            approvals.push({
              token,
              spenderAddress,
              logoUri: exposure.logo_url,
              usdPrice: exposure.usd_price,
            });
          }
        }
      }
    }
  }

  if (approvals.length === 0) {
    return undefined;
  }

  const isEditable =
    approvals.length === 1 &&
    approvals[0]?.token.type === TokenType.ERC20 &&
    rpcMethod === RpcMethod.ETH_SEND_TRANSACTION;

  return { isEditable, approvals };
};

export const processBalanceChange = (assetDiffs: AssetDiffs): BalanceChange | undefined => {
  const ins = processAssetDiffs(assetDiffs, 'in');
  const outs = processAssetDiffs(assetDiffs, 'out');

  if (ins.length === 0 && outs.length === 0) {
    return undefined;
  }

  return { ins, outs };
};

const processAssetDiffs = (assetDiffs: AssetDiffs, type: 'in' | 'out'): TokenDiff[] => {
  return (
    assetDiffs
      .filter((assetDiff) => assetDiff[type].length > 0)
      // sort asset diffs by length of in/out array
      // this is done to ensure that the token with multiple in/out values are displayed last,
      // to put them in groups with appropriate UI(i.e. accordion), after single in/out tokens
      .sort((a, b) => a[type].length - b[type].length)
      .map((assetDiff) => {
        const asset = assetDiff.asset;
        // convert blockaid asset to network token
        const token: NetworkToken | NetworkContractToken | undefined =
          'address' in asset ? convertAssetToNetworkContractToken(asset) : convertNativeAssetToToken(asset);
        if (!token) {
          return undefined;
        }

        const items = assetDiff[type]
          .map((diff) => {
            let displayValue;
            if ('value' in diff && diff.value) {
              if ('decimals' in token) {
                const valueBN = numberToBN(diff.value, token.decimals);
                displayValue = balanceToDisplayValue(valueBN, token.decimals);
              } else if (isHexString(diff.value)) {
                // for some token (like ERC1155) blockaid returns value in hex format
                displayValue = parseInt(diff.value, 16).toString();
              }
            } else if ('type' in token && token.type === TokenType.ERC721) {
              // for ERC721 type token, we just display 1 to indicate that a single NFT will be transferred
              displayValue = '1';
            }

            return displayValue ? { displayValue, usdPrice: diff.usd_price } : undefined;
          })
          .filter((x): x is TokenDiffItem => x !== undefined);

        return { token, items };
      })
      .filter((x): x is TokenDiff => x !== undefined)
  );
};

const convertAssetToNetworkContractToken = (
  asset:
    | Blockaid.Erc20TokenDetails
    | Blockaid.Erc1155TokenDetails
    | Blockaid.Erc721TokenDetails
    | Blockaid.NonercTokenDetails,
): NetworkContractToken | undefined => {
  let token: NetworkContractToken | undefined;
  if (asset.type === 'ERC20') {
    token = {
      type: TokenType.ERC20,
      address: asset.address,
      decimals: asset.decimals,
      name: asset.name ?? asset.symbol ?? '',
      symbol: asset.symbol ?? '',
      logoUri: asset.logo_url,
    };
  } else if (asset.type === 'ERC1155') {
    token = {
      type: TokenType.ERC1155,
      address: asset.address,
      logoUri: asset.logo_url,
      name: asset.name,
      symbol: asset.symbol,
    };
  } else if (asset.type === 'ERC721') {
    token = {
      type: TokenType.ERC721,
      address: asset.address,
      logoUri: asset.logo_url,
      name: asset.name,
      symbol: asset.symbol,
    };
  } else if (asset.type === 'NONERC') {
    token = {
      type: TokenType.NONERC,
      address: asset.address,
      logoUri: asset.logo_url,
      name: asset.name,
      symbol: asset.symbol,
    };
  }

  return token;
};

const convertNativeAssetToToken = (asset: Blockaid.NativeAssetDetails): NetworkToken => {
  return {
    name: asset.name ?? '',
    symbol: asset.symbol ?? '',
    decimals: asset.decimals,
    description: '',
    logoUri: asset.logo_url,
  };
};

export const processJsonRpcSimulation = async ({
  request,
  dAppUrl,
  accountAddress,
  chainId,
  data,
  proxyApiUrl,
}: {
  request: RpcRequest;
  dAppUrl?: string;
  accountAddress: string;
  data: { method: string; params: unknown };
  chainId: number;
  proxyApiUrl: string;
}) => {
  let alert: Alert | undefined;
  let balanceChange: BalanceChange | undefined;
  let tokenApprovals: TokenApprovals | undefined;

  try {
    const { validation, simulation } = await scanJsonRpc({
      proxyApiUrl,
      chainId,
      accountAddress,
      data: data as Blockaid.Evm.JsonRpcScanParams.Data,
      domain: dAppUrl,
    });

    if (!validation || validation.result_type === 'Error' || validation.result_type === 'Warning') {
      alert = transactionAlerts[AlertType.WARNING];
    } else if (validation.result_type === 'Malicious') {
      alert = transactionAlerts[AlertType.DANGER];
    }

    if (simulation?.status === 'Success') {
      tokenApprovals = processTokenApprovals(request.method, simulation.account_summary);
      balanceChange = processBalanceChange(simulation.account_summary.assets_diffs);
    }
  } catch (error) {
    console.error('processJsonRpcSimulation error', error);
    alert = transactionAlerts[AlertType.WARNING];
  }

  return { alert, balanceChange, tokenApprovals };
};
