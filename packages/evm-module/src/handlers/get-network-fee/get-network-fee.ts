import type { NetworkFees } from '@avalabs/vm-module-types';
import { getProvider } from '../../utils/get-provider';
import { rpcErrors } from '@metamask/rpc-errors';

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
  proxyApiUrl: string;
  multiContractAddress?: string;
  caipId?: string;
}): Promise<NetworkFees> {
  const provider = getProvider({
    chainId,
    chainName,
    rpcUrl,
    multiContractAddress,
  });

  const { maxFeePerGas: maxFeePerGasInWei } = await provider.getFeeData();
  if (!maxFeePerGasInWei) {
    throw rpcErrors.internal('Pre-EIP-1559 networks are not supported');
  }

  const gasMultiplier = await getGasMultiplier(proxyApiUrl, caipId);

  const countInt = gasMultiplier.toString().split('.')[0]?.length || 0;

  const countDecimal = gasMultiplier.toString().split('.')[1]?.length || 0;

  const denomination = parseInt('1'.padEnd(countInt + countDecimal, '0'));

  const defaultGasMultiplier = BigInt(gasMultiplier * denomination);

  const maxFee = ((maxFeePerGasInWei / 2n) * defaultGasMultiplier) / BigInt(denomination);

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
  };
}

async function getGasMultiplier(proxyApiUrl: string, caipId?: string) {
  const defaultMultiplier = 1.5;
  if (!caipId) {
    return defaultMultiplier;
  }
  const respond = await fetch(proxyApiUrl);

  const multipliers = await respond.json();

  return multipliers[caipId] ?? multipliers.default ?? defaultMultiplier;
}
