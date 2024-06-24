import type { GetNetworkFeeParams, NetworkFees } from '@avalabs/vm-module-types';
import { getProvider } from '../../utils/get-provider';

const DEFAULT_PRESETS = {
  LOW: 1n,
  MEDIUM: 4n,
  HIGH: 6n,
};

const BASE_PRIORITY_FEE_WEI = 500000000n; //0.5 GWei

/**
 * Returns {@link NetworkFees} based on {@link DEFAULT_PRESETS} multipliers.
 * @param glacierApiUrl
 * @param glacierApiKey
 * @params GetNetworkFeeParams
 * @throws Error if provider does not support eip-1559
 */
export async function getNetworkFee({
  glacierApiUrl,
  glacierApiKey,
  chainId,
  chainName,
  rpcUrl,
  multiContractAddress,
}: GetNetworkFeeParams & {
  glacierApiUrl: string;
  glacierApiKey?: string;
}): Promise<NetworkFees> {
  const provider = getProvider({
    glacierApiUrl,
    glacierApiKey,
    chainId,
    chainName,
    rpcUrl,
    multiContractAddress,
  });
  const { maxFeePerGas: maxFeePerGasInWei } = await provider.getFeeData();
  if (!maxFeePerGasInWei) {
    throw new Error('Pre-EIP-1559 networks are not supported');
  }

  const lowMaxTip = BASE_PRIORITY_FEE_WEI * DEFAULT_PRESETS.LOW;
  const mediumMaxTip = BASE_PRIORITY_FEE_WEI * DEFAULT_PRESETS.MEDIUM;
  const highMaxTip = BASE_PRIORITY_FEE_WEI * DEFAULT_PRESETS.HIGH;
  return {
    baseFee: maxFeePerGasInWei,
    low: {
      maxFeePerGas: maxFeePerGasInWei + lowMaxTip,
      maxPriorityFeePerGas: lowMaxTip,
    },
    medium: {
      maxFeePerGas: maxFeePerGasInWei + mediumMaxTip,
      maxPriorityFeePerGas: mediumMaxTip,
    },
    high: {
      maxFeePerGas: maxFeePerGasInWei + highMaxTip,
      maxPriorityFeePerGas: highMaxTip,
    },
  };
}
