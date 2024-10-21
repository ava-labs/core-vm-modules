import type { NetworkFees } from '@avalabs/vm-module-types';
import { getProvider } from '../../utils/get-provider';
import { rpcErrors } from '@metamask/rpc-errors';
import { TokenUnit } from '@avalabs/core-utils-sdk';

const DEFAULT_PRESETS = {
  LOW: 1n,
  MEDIUM: 4n,
  HIGH: 6n,
};

const BASE_PRIORITY_FEE_WEI = 500000000n; //0.5 GWei

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
}: {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  proxyApiUrl?: string;
  multiContractAddress?: string;
  caipId?: string;
}): Promise<NetworkFees> {
  const provider = await getProvider({
    chainId,
    chainName,
    rpcUrl,
    multiContractAddress,
  });

  if (!proxyApiUrl) {
    throw rpcErrors.internal('Proxy API URL is needed');
  }
  const lastBlock = await provider.getBlock('latest', false);

  if (!lastBlock) {
    throw rpcErrors.internal('There is no block');
  }
  const baseFeePerGasWei = lastBlock.baseFeePerGas;

  if (!baseFeePerGasWei) {
    throw rpcErrors.internal('Pre-EIP-1559 networks are not supported');
  }

  const ethMaxDecimals = 18;
  const baseFeePerGasEth = new TokenUnit(baseFeePerGasWei, ethMaxDecimals, 'ETH');
  const gasMultiplier = await getGasMultiplier(proxyApiUrl, caipId);
  const maxPriorityFeePerGasEth = new TokenUnit(1000000000n, ethMaxDecimals, 'ETH');

  const maxFeeWei = baseFeePerGasEth.mul(gasMultiplier).add(maxPriorityFeePerGasEth).toSubUnit();

  const lowMaxTip = BASE_PRIORITY_FEE_WEI * DEFAULT_PRESETS.LOW;
  const mediumMaxTip = BASE_PRIORITY_FEE_WEI * DEFAULT_PRESETS.MEDIUM;
  const highMaxTip = BASE_PRIORITY_FEE_WEI * DEFAULT_PRESETS.HIGH;
  return {
    baseFee: maxFeeWei,
    low: {
      maxFeePerGas: maxFeeWei + lowMaxTip,
      maxPriorityFeePerGas: lowMaxTip,
    },
    medium: {
      maxFeePerGas: maxFeeWei + mediumMaxTip,
      maxPriorityFeePerGas: mediumMaxTip,
    },
    high: {
      maxFeePerGas: maxFeeWei + highMaxTip,
      maxPriorityFeePerGas: highMaxTip,
    },
    isFixedFee: false,
    displayDecimals: 9,
  };
}

async function getGasMultiplier(proxyApiUrl: string, caipId?: string): Promise<number> {
  const defaultMultiplier = 1.5;
  if (!caipId) {
    return defaultMultiplier;
  }

  try {
    const respond = await fetch(proxyApiUrl);

    if (!respond.ok) {
      throw new Error(respond.statusText);
    }
    const multipliers = await respond.json();

    return multipliers[caipId] ?? multipliers.default;
  } catch (e) {
    return defaultMultiplier;
  }
}
