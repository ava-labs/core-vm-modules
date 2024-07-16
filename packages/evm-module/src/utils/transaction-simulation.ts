import Blockaid from '@blockaid/client';
import type { TransactionParams } from '../types';
import {
  type AssetExposure,
  type AssetDiffs,
  type AssetDiffItem,
  type NetworkContractToken,
  type NetworkToken,
  type AssetDiff,
  type TransactionSimulation,
  type TransactionValidation,
  TokenType,
  TransactionValidationResultType,
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
  let transactionValidation: TransactionValidation | undefined = undefined;
  let transactionSimulation: TransactionSimulation | undefined = undefined;

  const { validation, simulation } = await scanTransaction({
    proxyApiUrl,
    chainId,
    params,
    domain: dAppUrl,
  });

  if (!validation || validation.result_type === 'Error') {
    transactionValidation = {
      resultType: TransactionValidationResultType.ERROR,
      warningDetails: {
        title: 'Suspicious Transaction',
        description: 'Use caution, this transaction may be malicious.',
      },
    };
  } else if (validation.result_type === 'Warning') {
    transactionValidation = {
      resultType: TransactionValidationResultType.WARNING,
      warningDetails: {
        title: 'Suspicious Transaction',
        description: 'Use caution, this transaction may be malicious.',
      },
    };
  } else if (validation.result_type === 'Malicious') {
    transactionValidation = {
      resultType: TransactionValidationResultType.MALICIOUS,
      warningDetails: {
        title: 'Scam Transaction',
        description: 'This transaction is malicious, do not proceed.',
        actionTitles: {
          reject: 'Reject Transaction',
          proceed: 'Proceed Anyway',
        },
      },
    };
  } else if (validation.result_type === 'Benign') {
    transactionValidation = {
      resultType: TransactionValidationResultType.BENIGN,
    };
  }

  if (simulation?.status === 'Success') {
    const exposures = getExposures(simulation);
    const assetDiffs = getAssetDiffs(simulation);

    transactionSimulation = {
      assetDiffs,
      exposures,
    };
  }

  return { transactionValidation, transactionSimulation };
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

const getExposures = (transactionSimulation: Blockaid.TransactionSimulation): AssetExposure[] => {
  const exposures: AssetExposure[] = [];

  for (const exposurePerAsset of transactionSimulation.account_summary.exposures) {
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
        exposures.push({
          token,
          spenderAddress,
          logoUri: asset.logo_url,
        });
      } else {
        for (const exposure of exposurePerSpender.exposure) {
          if ('raw_value' in exposure) {
            exposures.push({
              token,
              spenderAddress,
              value: exposure.raw_value,
              usdPrice: exposure.usd_price,
              logoUri: asset.logo_url,
            });
          } else {
            exposures.push({
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

  return exposures;
};

const getAssetDiffs = (transactionSimulation: Blockaid.TransactionSimulation): AssetDiffs => {
  const assetDiffs = transactionSimulation.account_summary.assets_diffs;
  const ins = processAssetDiffs(assetDiffs, 'in');
  const outs = processAssetDiffs(assetDiffs, 'out');

  return { ins, outs };
};

const processAssetDiffs = (assetDiffs: Blockaid.AssetDiff[], type: 'in' | 'out'): AssetDiff[] => {
  return assetDiffs
    .filter((assetDiff) => assetDiff[type].length > 0)
    .sort((a, b) => a[type].length - b[type].length)
    .map((assetDiff) => {
      const asset = assetDiff.asset;
      if (!asset || !asset.name || !asset.symbol) {
        return undefined;
      }

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
          let value;
          if ('value' in diff && diff.value) {
            if (token.decimals) {
              const valueBN = numberToBN(diff.value, token.decimals);
              value = balanceToDisplayValue(valueBN, token.decimals);
            } else if (isHexString(diff.value)) {
              // for some token (like ERC1155) blockaid returns value in hex format
              value = parseInt(diff.value, 16).toString();
            }
          } else if ('contractType' in token && token.contractType === TokenType.ERC721) {
            // for ERC721 type token, we just display 1 to indicate that a single NFT will be transferred
            value = '1';
          }

          return value ? { value, usdPrice: diff.usd_price } : undefined;
        })
        .filter((x): x is AssetDiffItem => x !== undefined);

      return { token, items };
    })
    .filter((x): x is AssetDiff => x !== undefined);
};
