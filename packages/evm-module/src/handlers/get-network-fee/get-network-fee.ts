import type { NetworkFees } from '@avalabs/vm-module-types';
import { getProvider } from '../../utils/get-provider';
import { rpcErrors } from '@metamask/rpc-errors';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { isSwimmerNetworkByChainAndCaipId } from '../../utils/is-swimmer-network';

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
  const provider = getProvider({
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
    isFixedFee: isSwimmerNetworkByChainAndCaipId(chainId, caipId || '') ? true : false,
    displayDecimals: 9,
  };
}

async function getGasMultiplier(proxyApiUrl: string, caipId?: string) {
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
