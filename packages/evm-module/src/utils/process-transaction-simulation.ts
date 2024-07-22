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
} from '@avalabs/vm-module-types';
import { balanceToDisplayValue, numberToBN } from '@avalabs/utils-sdk';
import { isHexString } from 'ethers';
import { scanJsonRpc, scanTransaction } from './scan-transaction';

export const processTransactionSimulation = async ({
  dAppUrl,
  params,
  chainId,
  proxyApiUrl,
}: {
  dAppUrl?: string;
  params: TransactionParams;
  chainId: number;
  proxyApiUrl: string;
}) => {
  const { validation, simulation } = await scanTransaction({
    proxyApiUrl,
    chainId,
    params,
    domain: dAppUrl,
  });

  let alert: Alert | undefined;
  if (!validation || validation.result_type === 'Error' || validation.result_type === 'Warning') {
    alert = {
      type: AlertType.WARNING,
      details: {
        title: 'Suspicious Transaction',
        description: 'Use caution, this transaction may be malicious.',
      },
    };
  } else if (validation.result_type === 'Malicious') {
    alert = {
      type: AlertType.DANGER,
      details: {
        title: 'Scam Transaction',
        description: 'This transaction is malicious, do not proceed.',
        actionTitles: {
          reject: 'Reject Transaction',
          proceed: 'Proceed Anyway',
        },
      },
    };
  }

  let balanceChange: BalanceChange | undefined;
  let tokenApprovals: TokenApproval[] = [];

  if (simulation?.status === 'Success') {
    tokenApprovals = processTokenApprovals(simulation.account_summary.exposures);
    balanceChange = processBalanceChange(simulation.account_summary.assets_diffs);
  }

  return { alert, balanceChange, tokenApprovals };
};

const processTokenApprovals = (exposures: Blockaid.AddressAssetExposure[]): TokenApproval[] => {
  const tokenApprovals: TokenApproval[] = [];

  for (const exposurePerAsset of exposures) {
    const token = convertAssetToNetworkContractToken(exposurePerAsset.asset);
    if (!token) {
      continue;
    }

    for (const [spenderAddress, exposurePerSpender] of Object.entries(exposurePerAsset.spenders)) {
      if (exposurePerSpender.exposure.length === 0) {
        tokenApprovals.push({
          token,
          spenderAddress,
          logoUri: token.logoUri,
        });
      } else {
        for (const exposure of exposurePerSpender.exposure) {
          if ('raw_value' in exposure) {
            tokenApprovals.push({
              token,
              spenderAddress,
              value: exposure.raw_value,
              usdPrice: exposure.usd_price,
              logoUri: token.logoUri,
            });
          } else {
            tokenApprovals.push({
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

  return tokenApprovals;
};

export const processBalanceChange = (assetDiffs: Blockaid.AssetDiff[]): BalanceChange | undefined => {
  const ins = processAssetDiffs(assetDiffs, 'in');
  const outs = processAssetDiffs(assetDiffs, 'out');

  if (ins.length === 0 && outs.length === 0) {
    return undefined;
  }

  return { ins, outs };
};

const processAssetDiffs = (assetDiffs: Blockaid.AssetDiff[], type: 'in' | 'out'): TokenDiff[] => {
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
  dAppUrl,
  accountAddress,
  chainId,
  data,
  proxyApiUrl,
}: {
  dAppUrl?: string;
  accountAddress: string;
  data: { method: string; params: unknown };
  chainId: number;
  proxyApiUrl: string;
}) => {
  const { validation, simulation } = await scanJsonRpc({
    proxyApiUrl,
    chainId,
    accountAddress,
    data: data as Blockaid.Evm.JsonRpcScanParams.Data,
    domain: dAppUrl,
  });

  let alert: Alert | undefined;
  if (!validation || validation.result_type === 'Error' || validation.result_type === 'Warning') {
    alert = {
      type: AlertType.WARNING,
      details: {
        title: 'Suspicious Transaction',
        description: 'Use caution, this transaction may be malicious.',
      },
    };
  } else if (validation.result_type === 'Malicious') {
    alert = {
      type: AlertType.DANGER,
      details: {
        title: 'Scam Transaction',
        description: 'This transaction is malicious, do not proceed.',
        actionTitles: {
          reject: 'Reject Transaction',
          proceed: 'Proceed Anyway',
        },
      },
    };
  }

  let balanceChange: BalanceChange | undefined;
  let tokenApprovals: TokenApproval[] = [];

  if (simulation?.status === 'Success') {
    tokenApprovals = processTokenApprovals(simulation.account_summary.exposures);
    balanceChange = processBalanceChange(simulation.account_summary.assets_diffs);
  }

  return { alert, balanceChange, tokenApprovals };
};
