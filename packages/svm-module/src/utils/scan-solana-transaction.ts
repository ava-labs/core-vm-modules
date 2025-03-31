import Blockaid from '@blockaid/client';
import { base58, base64 } from '@scure/base';
import { deserializeTransactionMessage } from '@avalabs/core-wallets-sdk';
import {
  AlertType,
  TokenType,
  type Alert,
  type BalanceChange,
  type DetailSection,
  type Network,
  type NetworkToken,
  type SPLToken,
  type TokenDiff,
  type TransactionSimulationResult,
} from '@avalabs/vm-module-types';

import { isFulfilled } from '@internal/utils/src/utils/is-promise-fulfilled';

import { isNotNullish } from './functional';
import type { getProvider } from './get-provider';
import { transactionAlerts } from './transaction-alerts';
import { tryToParseSolTransfer } from './instruction-parsers/sol-transfer';
import { tryToParseSPLTransfer } from './instruction-parsers/spl-transfer';
import type { SolanaNetworkName } from '../types';

const DUMMY_API_KEY = 'DUMMY_API_KEY'; // since we're using our own proxy and api key is handled there, we can use a dummy key here

type ScanParams = {
  proxyApiUrl: string;
  params: {
    account: string;
    chain: SolanaNetworkName;
    transactionBase64: string;
  };
  dAppUrl: string;
};

// Simplify access to Blockaid's typings
type SolanaSimulation = Blockaid.Solana.MessageScanResponse.Result.Simulation;
type AccountSummaryAssetDiff = SolanaSimulation['account_summary']['account_assets_diff'];
type SolanaSimulationAsset = Exclude<AccountSummaryAssetDiff, undefined>[number]['asset'];

export const scanSolanaTransaction = async ({
  proxyApiUrl,
  params,
  dAppUrl,
}: ScanParams): Promise<Blockaid.Solana.Message.MessageScanResponse | null> => {
  const blockaid = new Blockaid({
    baseURL: proxyApiUrl + '/proxy/blockaid/',
    apiKey: DUMMY_API_KEY,
  });

  try {
    return await blockaid.solana.message.scan({
      chain: params.chain,
      options: ['simulation', 'validation'],
      encoding: 'base64',
      metadata: {
        url: dAppUrl,
      },
      transactions: [params.transactionBase64],
      // We need to encode the account address to base64 as well
      account_address: base64.encode(base58.decode(params.account)),
    });
  } catch (err) {
    console.error('solana.message.scan() error', err);
    return null;
  }
};

export const parseTransaction = async (
  serializedTx: string,
  account: string,
  network: Network,
  provider: ReturnType<typeof getProvider>,
) => {
  const transaction = await deserializeTransactionMessage(serializedTx, provider);
  const balanceChange: BalanceChange = {
    ins: [],
    outs: [],
  };

  const details = await Promise.allSettled(
    transaction.instructions.map(async (instruction) => {
      return (
        tryToParseSolTransfer(instruction, balanceChange, account, network.networkToken) ??
        (await tryToParseSPLTransfer(provider, instruction, balanceChange, account, network.tokens as SPLToken[])) ??
        null
      );
    }),
  ).then((results) =>
    results
      .filter(isFulfilled)
      .map((result) => result.value)
      .filter(isNotNullish),
  );

  return {
    isSimulationSuccessful: false,
    balanceChange,
    details,
  };
};

export const simulateTransaction = async ({
  simulationParams,
  network,
  provider,
}: {
  simulationParams: ScanParams;
  network: Network;
  provider: ReturnType<typeof getProvider>;
}): Promise<TransactionSimulationResult & { details: DetailSection[] }> => {
  const { params } = simulationParams;
  const scanResponse = await scanSolanaTransaction(simulationParams);

  const isSimulationSuccessful = Boolean(scanResponse?.result?.simulation);

  const { simulation, validation } = scanResponse?.result ?? {};
  let details: DetailSection[] = [];
  let balanceChange: BalanceChange = { ins: [], outs: [] };
  let alert: Alert | undefined;

  if (!simulation) {
    const parseResult = await parseTransaction(params.transactionBase64, params.account, network, provider);

    balanceChange = parseResult.balanceChange;
    details = parseResult.details;
    alert = transactionAlerts[AlertType.DANGER];
  } else {
    balanceChange = processBalanceChange(simulation, network);
  }

  if (!validation || validation.result_type === 'Warning') {
    alert = transactionAlerts[AlertType.DANGER];
  } else if (validation.result_type === 'Malicious') {
    alert = transactionAlerts[AlertType.DANGER];
  }

  return {
    isSimulationSuccessful,
    details,
    alert,
    balanceChange,
  };
};

const convertNativeAssetToToken = (
  asset: Blockaid.Solana.MessageScanResponse.Result.Simulation.SolanaNativeAssetDiff.Asset,
): NetworkToken => {
  return {
    name: asset.type,
    symbol: asset.type, // It's either SOL or ETH
    decimals: asset.decimals,
    description: '',
    logoUri: asset.logo ?? undefined,
  };
};

const convertTokenAssetToToken = (
  asset: Blockaid.Solana.MessageScanResponse.Result.Simulation.SolanaSplFungibleAssetDiff.Asset,
  network: Network,
): SPLToken => ({
  type: TokenType.SPL,
  address: asset.address,
  caip2Id: network.caipId ?? '',
  contractType: TokenType.SPL,
  decimals: asset.decimals,
  name: asset.name,
  symbol: asset.symbol,
  logoUri: asset.logo || undefined,
});

const convertDiffAssetToToken = (asset: SolanaSimulationAsset, network: Network): SPLToken | NetworkToken | null => {
  if (asset.type === 'TOKEN') {
    return convertTokenAssetToToken(asset, network);
  }

  if (asset.type === 'SOL' || asset.type === 'ETH') {
    return convertNativeAssetToToken(asset);
  }

  return null;
};

export const processBalanceChange = (
  simulationResult: Blockaid.Solana.Message.MessageScanResponse.Result.Simulation,
  network: Network,
): BalanceChange => {
  const transferedAssets = simulationResult.account_summary.account_assets_diff ?? [];

  const inTokenDiffDict: Record<string, TokenDiff> = {};
  const outTokenDiffDict: Record<string, TokenDiff> = {};

  transferedAssets.forEach(({ asset, in: assetIn, out: assetOut }) => {
    const token = convertDiffAssetToToken(asset, network);

    if (!token) {
      return;
    }

    const identifier = 'address' in token ? token.address : token.symbol;

    if (assetIn) {
      if (!inTokenDiffDict[identifier]) {
        inTokenDiffDict[identifier] = {
          token,
          items: [],
        };
      }

      inTokenDiffDict[identifier].items.push({
        displayValue: String(assetIn.value),
        usdPrice: typeof assetIn.usd_price === 'number' ? String(assetIn.usd_price) : undefined,
      });
    }

    if (assetOut) {
      if (!outTokenDiffDict[identifier]) {
        outTokenDiffDict[identifier] = {
          token,
          items: [],
        };
      }
      outTokenDiffDict[identifier].items.push({
        displayValue: String(assetOut.value),
        usdPrice: typeof assetOut.usd_price === 'number' ? String(assetOut.usd_price) : undefined,
      });
    }
  });

  return {
    ins: Object.values(inTokenDiffDict),
    outs: Object.values(outTokenDiffDict),
  };
};
/**
 * {
  "encoding": "base64",
  "status": "SUCCESS",
  "result": {
    "simulation": {
      "assets_diff": {
        "6KQNvuNNFsmLunvn9AohJm9svw27XXCeknxLy5vbgTkL": [
          {
            "asset": {
              "type": "SOL",
              "decimals": 9,
              "logo": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
            },
            "in": null,
            "out": {
              "usd_price": 130.94,
              "summary": "Lost approximately 130.94$",
              "value": 1.000005,
              "raw_value": 1000005000
            },
            "asset_type": "SOL"
          }
        ],
        "i4Pj1685KFncYG5VoVVyNwoHv1CTMWWGDSpKG3pw6KA": [
          {
            "asset": {
              "type": "SOL",
              "decimals": 9,
              "logo": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
            },
            "in": {
              "usd_price": 130.93,
              "summary": "Gained approximately 130.93$",
              "value": 1,
              "raw_value": 1000000000
            },
            "out": null,
            "asset_type": "SOL"
          }
        ]
      },
      "delegations": {},
      "assets_ownership_diff": {},
      "accounts_details": [
        {
          "account_address": "11111111111111111111111111111111",
          "description": "N/A",
          "type": "NATIVE_PROGRAM",
          "was_written_to": false
        },
        {
          "account_address": "i4Pj1685KFncYG5VoVVyNwoHv1CTMWWGDSpKG3pw6KA",
          "description": null,
          "type": "SYSTEM_ACCOUNT",
          "was_written_to": true
        },
        {
          "account_address": "6KQNvuNNFsmLunvn9AohJm9svw27XXCeknxLy5vbgTkL",
          "description": null,
          "type": "SYSTEM_ACCOUNT",
          "was_written_to": true
        }
      ],
      "account_summary": {
        "account_assets_diff": [
          {
            "asset": {
              "type": "SOL",
              "decimals": 9,
              "logo": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
            },
            "in": null,
            "out": {
              "usd_price": 130.94,
              "summary": "Lost approximately 130.94$",
              "value": 1.000005,
              "raw_value": 1000005000
            },
            "asset_type": "SOL"
          }
        ],
        "account_delegations": [],
        "account_ownerships_diff": [],
        "total_usd_diff": {
          "in": 0,
          "out": 130.94,
          "total": -130.94
        },
        "total_usd_exposure": {}
      }
    },
    "validation": {
      "result_type": "Benign",
      "reason": "",
      "features": [],
      "extended_features": []
    }
  },
  "error": null,
  "error_details": null,
  "request_id": "222c6ef9-8623-48e3-8802-83889649c3f8"
}
 */
