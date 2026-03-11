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
import { isHexString, MaxUint256 } from 'ethers';
import { scanJsonRpc, scanTransaction } from './scan-transaction';
import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';
import { parseWithErc20Abi } from './parse-erc20-tx';
import { hasToField } from './type-utils';
import { transactionAlerts } from './transaction-alerts';

type Erc20ExposureTrace = Blockaid.Evm.AccountSummary.Erc20ExposureTrace;
type Erc721ExposureTrace = Blockaid.Evm.AccountSummary.Erc721ExposureTrace;
type Erc1155ExposureTrace = Blockaid.Evm.AccountSummary.Erc1155ExposureTrace;

/*
 * Although in the type definition they don't specify it, but for traces they are returning the asset as well:
 * https://docs.blockaid.io/changelog/november-12-2024#account-traces
 * */
type ExposureTrace =
  | (Erc20ExposureTrace & { asset: Blockaid.Evm.Erc20TokenDetails })
  | (Erc721ExposureTrace & { asset: Blockaid.Evm.Erc721TokenDetails })
  | (Erc1155ExposureTrace & { asset: Blockaid.Evm.Erc1155TokenDetails });
type Trace = Blockaid.Evm.AccountSummary['traces']['0'];
export type AssetDiffs = Blockaid.Evm.AccountSummary['assets_diffs'];

export const simulateTransaction = async ({
  rpcMethod,
  dAppUrl,
  params,
  chainId,
  provider,
  blockaid,
}: {
  rpcMethod: RpcMethod;
  dAppUrl?: string;
  params: TransactionParams;
  chainId: number;
  provider: JsonRpcBatchInternal;
  blockaid: Blockaid;
}) => {
  let simulationResult: Pick<Blockaid.TransactionScanResponse, 'simulation' | 'validation'> | undefined;

  try {
    simulationResult = await scanTransaction({
      chainId,
      params,
      domain: dAppUrl,
      blockaid,
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
  return (trace as ExposureTrace).trace_type === 'ExposureTrace';
};

const normalizeAddresses = (spender: string, assetAddress: string): string =>
  `${spender.toLowerCase()}.${assetAddress.toLowerCase()}`;

const mapExposureTracesToSpenderAsset = (traces: Trace[]): Record<string, ExposureTrace> => {
  if (traces === undefined || traces.length === 0) {
    return {};
  }

  return traces.reduce(
    (accumulator, trace) => {
      if (!isExposureTrace(trace)) {
        return accumulator;
      }
      return {
        [normalizeAddresses(trace.spender, trace.asset.address)]: trace,
      };
    },
    {} as Record<string, ExposureTrace>,
  );
};

const processTokenApprovals = (
  rpcMethod: RpcMethod,
  accountSummary: Blockaid.Evm.AccountSummary,
): TokenApprovals | undefined => {
  const { traces } = accountSummary;

  const mappedExposureTraces = mapExposureTracesToSpenderAsset(traces);

  const approvals = Object.entries(mappedExposureTraces)
    .map(([_, trace]) => {
      const token = convertAssetToNetworkContractToken(trace.asset);
      if (!token) {
        return;
      }

      const tokenApproval: TokenApproval = {
        token,
        spenderAddress: trace.spender,
        logoUri: token.logoUri,
      };

      if (trace.type === 'ERC20ExposureTrace') {
        const {
          exposed: { raw_value, value, usd_price },
        } = trace as Erc20ExposureTrace;

        // Only show approval when the spender's exposure increases.
        // Skips retries (0 change) and reduced allowances (negative change).
        if (!value || value <= 0) {
          return;
        }

        tokenApproval.value = raw_value;
        tokenApproval.usdPrice = `${usd_price}`;
      }

      if (trace.type === 'ERC721ExposureTrace') {
        // When dApp attempts to call setApprovalForAll(), the "exposed" field is not present.
        // However, the result of such transaction is that the spender gets approval for all
        // tokens in the NFT collection, so we treat it the same as "Unlimited" approval for ERC-20.
        if (!trace.exposed) {
          tokenApproval.value = `0x${MaxUint256.toString(16)}`;
        } else {
          const { usd_price, amount } = trace.exposed;

          tokenApproval.value = `${amount}`;
          tokenApproval.usdPrice = `${usd_price}`;
        }
      }

      return tokenApproval;
    })
    .filter(Boolean) as TokenApproval[];

  if (approvals.length === 0) {
    return undefined;
  }

  const isEditable =
    approvals.length === 1 &&
    approvals[0]?.token.type === TokenType.ERC20 &&
    rpcMethod === RpcMethod.ETH_SEND_TRANSACTION;

  return { isEditable, approvals };
};

export const processBalanceChange = (accountSummaryAssetsDiffs: AssetDiffs): BalanceChange | undefined => {
  const ins = processAssetDiffs(accountSummaryAssetsDiffs, 'in');
  const outs = processAssetDiffs(accountSummaryAssetsDiffs, 'out');

  if (ins.length === 0 && outs.length === 0) {
    return undefined;
  }

  return { ins, outs };
};

const processAssetDiffs = (accountSummaryAssetsDiffs: AssetDiffs, type: 'in' | 'out'): TokenDiff[] => {
  return (
    accountSummaryAssetsDiffs
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

            if (!displayValue) {
              return undefined;
            }

            const logoUri = 'logo_url' in diff ? diff.logo_url : undefined;
            const tokenId = 'token_id' in diff ? diff.token_id : undefined;

            const item: TokenDiffItem = {
              displayValue,
              usdPrice: diff.usd_price,
              ...(logoUri !== undefined && { logoUri }),
              ...(tokenId !== undefined && { tokenId }),
            };
            return item;
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
  blockaid,
}: {
  request: RpcRequest;
  dAppUrl?: string;
  accountAddress: string;
  data: { method: string; params: unknown };
  chainId: number;
  blockaid: Blockaid;
}) => {
  let alert: Alert | undefined;
  let balanceChange: BalanceChange | undefined;
  let tokenApprovals: TokenApprovals | undefined;

  try {
    const { validation, simulation } = await scanJsonRpc({
      chainId,
      accountAddress,
      data: data as Blockaid.Evm.JsonRpcScanParams.Data,
      domain: dAppUrl,
      blockaid,
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
