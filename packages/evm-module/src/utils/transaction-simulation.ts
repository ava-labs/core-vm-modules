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

export const simulateTransaction = async ({
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
    tokenApprovals = getTokenApprovals(simulation.account_summary.exposures);
    balanceChange = getBalanceChange(simulation.account_summary.assets_diffs);
  }

  return { alert, balanceChange, tokenApprovals };
};

const scanTransaction = async ({
  proxyApiUrl,
  chainId,
  params,
  domain,
}: {
  proxyApiUrl: string;
  chainId: number;
  params: TransactionParams;
  domain?: string;
}): Promise<Blockaid.TransactionScanResponse> => {
  const blockaid = new Blockaid({
    baseURL: proxyApiUrl + '/proxy/blockaid/',
    apiKey: 'DUMMY_API_KEY', // since we're using our own proxy and api key is handled there, we can use a dummy key here
  });

  return blockaid.evm.transaction.scan({
    account_address: params.from,
    chain: chainId.toString(),
    options: ['validation', 'simulation'],
    data: {
      from: params.from,
      to: params.to,
      data: params.data,
      value: params.value,
      gas: params.gas,
      gas_price: params.gasPrice,
    },
    metadata: (domain && domain.length > 0 ? { domain } : { non_dapp: true }) as Blockaid.Evm.Metadata,
  });
};

const getTokenApprovals = (exposures: Blockaid.AddressAssetExposure[]): TokenApproval[] => {
  const tokenApprovals: TokenApproval[] = [];

  for (const exposurePerAsset of exposures) {
    const asset = exposurePerAsset.asset;
    if (!asset || !asset.name || !asset.symbol) {
      continue;
    }

    const token: NetworkContractToken = {
      contractType: asset.type,
      address: asset.address,
      decimals: 'decimals' in asset ? asset.decimals : undefined,
      name: asset.name,
      symbol: asset.symbol,
      logoUri: asset.logo_url,
    };

    for (const [spenderAddress, exposurePerSpender] of Object.entries(exposurePerAsset.spenders)) {
      if (exposurePerSpender.exposure.length === 0) {
        tokenApprovals.push({
          token,
          spenderAddress,
          logoUri: asset.logo_url,
        });
      } else {
        for (const exposure of exposurePerSpender.exposure) {
          if ('raw_value' in exposure) {
            tokenApprovals.push({
              token,
              spenderAddress,
              value: exposure.raw_value,
              usdPrice: exposure.usd_price,
              logoUri: asset.logo_url,
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

export const getBalanceChange = (assetDiffs: Blockaid.AssetDiff[]): BalanceChange => {
  const ins = processAssetDiffs(assetDiffs, 'in');
  const outs = processAssetDiffs(assetDiffs, 'out');

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
        if (!asset || !asset.name || !asset.symbol) {
          return undefined;
        }

        // convert blockaid asset to network token
        const token: NetworkToken | NetworkContractToken =
          'address' in asset
            ? {
                contractType: asset.type,
                address: asset.address,
                name: asset.name,
                symbol: asset.symbol,
                decimals: 'decimals' in asset ? asset.decimals : undefined,
                logoUri: asset.logo_url,
              }
            : {
                name: asset.name,
                symbol: asset.symbol,
                decimals: asset.decimals,
                description: '',
                logoUri: asset.logo_url,
              };
        const items = assetDiff[type]
          .map((diff) => {
            let displayValue;
            if ('value' in diff && diff.value) {
              if (token.decimals) {
                const valueBN = numberToBN(diff.value, token.decimals);
                displayValue = balanceToDisplayValue(valueBN, token.decimals);
              } else if (isHexString(diff.value)) {
                // for some token (like ERC1155) blockaid returns value in hex format
                displayValue = parseInt(diff.value, 16).toString();
              }
            } else if ('contractType' in token && token.contractType === TokenType.ERC721) {
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
