import type { NetworkFees, SuggestGasPriceOptionsResponse } from '@avalabs/vm-module-types';
import { getProvider } from '../../utils/get-provider';
import { rpcErrors } from '@metamask/rpc-errors';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { ChainId } from '@avalabs/core-chains-sdk';
import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';

const DEFAULT_PRESETS = {
  LOW: 1n,
  MEDIUM: 4n,
  HIGH: 6n,
};

const BASE_PRIORITY_FEE_WEI = 500000000n; //0.5 GWei

const isCChain = (chainId: number) =>
  chainId === ChainId.AVALANCHE_TESTNET_ID || chainId === ChainId.AVALANCHE_MAINNET_ID;

const POLYGON_MAINNET_CHAIN_ID = 137;
const POLYGON_AMOY_CHAIN_ID = 80002;

const isPolygon = (chainId: number) => chainId === POLYGON_MAINNET_CHAIN_ID || chainId === POLYGON_AMOY_CHAIN_ID;

const POLYGON_GAS_STATION_URL: Record<number, string> = {
  [POLYGON_MAINNET_CHAIN_ID]: 'https://gasstation.polygon.technology/v2',
  [POLYGON_AMOY_CHAIN_ID]: 'https://gasstation.polygon.technology/amoy',
};

type PolygonGasStationResponse = {
  safeLow: { maxPriorityFee: number; maxFee: number };
  standard: { maxPriorityFee: number; maxFee: number };
  fast: { maxPriorityFee: number; maxFee: number };
  estimatedBaseFee: number;
};

function gweiToWei(gwei: number): bigint {
  return BigInt(Math.round(gwei * 1e9));
}

async function getPolygonGasStationFees(chainId: number): Promise<NetworkFees> {
  const url = POLYGON_GAS_STATION_URL[chainId];
  if (!url) throw new Error(`No gas station URL for Polygon chain ${chainId}`);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Polygon Gas Station returned ${response.status}`);

  const data: PolygonGasStationResponse = await response.json();

  return {
    baseFee: gweiToWei(data.estimatedBaseFee),
    low: {
      maxFeePerGas: gweiToWei(data.safeLow.maxFee),
      maxPriorityFeePerGas: gweiToWei(data.safeLow.maxPriorityFee),
    },
    medium: {
      maxFeePerGas: gweiToWei(data.standard.maxFee),
      maxPriorityFeePerGas: gweiToWei(data.standard.maxPriorityFee),
    },
    high: {
      maxFeePerGas: gweiToWei(data.fast.maxFee),
      maxPriorityFeePerGas: gweiToWei(data.fast.maxPriorityFee),
    },
    isFixedFee: false,
    displayDecimals: 9,
  };
}

/**
 * Returns {@link NetworkFees} based on {@link DEFAULT_PRESETS} multipliers.
 * @throws Error if provider does not support eip-1559
 */
export async function getNetworkFee({
  chainId,
  chainName,
  rpcUrl,
  multiContractAddress,
  caipId,
  proxyApiUrl,
  customRpcHeaders,
}: {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  proxyApiUrl?: string;
  multiContractAddress?: string;
  caipId?: string;
  customRpcHeaders?: Record<string, string>;
}): Promise<NetworkFees> {
  const provider = await getProvider({
    chainId,
    chainName,
    rpcUrl,
    multiContractAddress,
    customRpcHeaders,
  });

  if (!proxyApiUrl) {
    throw rpcErrors.internal('Proxy API URL is needed');
  }

  if (isCChain(chainId)) {
    try {
      const suggestedFees = await suggestPriceOptions(provider);

      return {
        ...suggestedFees,
        baseFee: suggestedFees.medium.maxFeePerGas,
        displayDecimals: 9,
        isFixedFee: false,
      };
    } catch (err) {
      console.error('eth_suggestPriceOptions call failed, falling back to legacy fee fetching');
    }
  }

  if (isPolygon(chainId)) {
    try {
      return await getPolygonGasStationFees(chainId);
    } catch (err) {
      console.error('Polygon Gas Station call failed, falling back to generic fee fetching');
    }
  }

  const lastBlock = await provider.getBlock('latest', false);

  if (!lastBlock) {
    throw rpcErrors.internal('There is no block');
  }
  const baseFeePerGas = lastBlock.baseFeePerGas;

  if (!baseFeePerGas) {
    throw rpcErrors.internal('Pre-EIP-1559 networks are not supported');
  }

  const gasMultiplier = await getGasMultiplier(proxyApiUrl, caipId);

  const multiplier = new TokenUnit(gasMultiplier, 0, '');

  const baseFee = new TokenUnit(baseFeePerGas, 0, '');
  const maxPriorityFeePerGas = BigInt('1000000000');

  const maxFee = baseFee.mul(multiplier).add(maxPriorityFeePerGas).toSubUnit();

  const lowMaxTip = BASE_PRIORITY_FEE_WEI * DEFAULT_PRESETS.LOW;
  const mediumMaxTip = BASE_PRIORITY_FEE_WEI * DEFAULT_PRESETS.MEDIUM;
  const highMaxTip = BASE_PRIORITY_FEE_WEI * DEFAULT_PRESETS.HIGH;
  return {
    baseFee: maxFee,
    low: {
      maxFeePerGas: maxFee + lowMaxTip,
      maxPriorityFeePerGas: lowMaxTip,
    },
    medium: {
      maxFeePerGas: maxFee + mediumMaxTip,
      maxPriorityFeePerGas: mediumMaxTip,
    },
    high: {
      maxFeePerGas: maxFee + highMaxTip,
      maxPriorityFeePerGas: highMaxTip,
    },
    isFixedFee: false,
    displayDecimals: 9,
  };
}

async function suggestPriceOptions(
  provider: JsonRpcBatchInternal,
): Promise<Pick<NetworkFees, 'low' | 'medium' | 'high'>> {
  const options: SuggestGasPriceOptionsResponse = await provider.send('eth_suggestPriceOptions', []);

  return {
    low: {
      maxFeePerGas: BigInt(options.slow.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(options.slow.maxPriorityFeePerGas),
    },
    medium: {
      maxFeePerGas: BigInt(options.normal.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(options.normal.maxPriorityFeePerGas),
    },
    high: {
      maxFeePerGas: BigInt(options.fast.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(options.fast.maxPriorityFeePerGas),
    },
  };
}

async function getGasMultiplier(proxyApiUrl: string, caipId?: string) {
  const defaultMultiplier = 1.5;
  if (!caipId) {
    return defaultMultiplier;
  }

  try {
    const respond = await fetch(`${proxyApiUrl}/gas/multiplier`);

    if (!respond.ok) {
      throw new Error(respond.statusText);
    }
    const multipliers = await respond.json();

    return multipliers[caipId] ?? multipliers.default;
  } catch (e) {
    return defaultMultiplier;
  }
}
