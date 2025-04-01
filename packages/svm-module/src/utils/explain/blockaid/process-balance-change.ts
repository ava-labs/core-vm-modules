import type Blockaid from '@blockaid/client';
import {
  TokenType,
  type BalanceChange,
  type Network,
  type NetworkToken,
  type SPLToken,
  type TokenDiff,
} from '@avalabs/vm-module-types';

// Simplify access to Blockaid's typings
type SolanaSimulation = Blockaid.Solana.MessageScanResponse.Result.Simulation;
type AccountSummaryAssetDiff = SolanaSimulation['account_summary']['account_assets_diff'];
type SolanaSimulationAsset = Exclude<AccountSummaryAssetDiff, undefined>[number]['asset'];

export const processBalanceChange = (
  account: string,
  simulationResult: Blockaid.Solana.Message.MessageScanResponse.Result.Simulation,
  network: Network,
): { balanceChange: BalanceChange; otherAffectedAddresses: string[] } => {
  const transferedAssets = simulationResult.account_summary.account_assets_diff ?? [];

  const inTokenDiffDict: Record<string, TokenDiff> = {};
  const outTokenDiffDict: Record<string, TokenDiff> = {};

  const otherAffectedAddresses: string[] = Object.keys(simulationResult.assets_diff ?? {}).filter(
    (key) => key !== account,
  );

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
    balanceChange: {
      ins: Object.values(inTokenDiffDict),
      outs: Object.values(outTokenDiffDict),
    },
    otherAffectedAddresses,
  };
};

const convertNativeAssetToToken = (
  asset: Blockaid.Solana.MessageScanResponse.Result.Simulation.SolanaNativeAssetDiff.Asset,
): NetworkToken => {
  return {
    name: asset.type,
    symbol: asset.type, // It's either SOL or ETH according to types
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
