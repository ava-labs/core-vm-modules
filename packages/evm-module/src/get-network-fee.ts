import { JsonRpcProvider } from 'ethers';
import type { NetworkFees } from '@internal/types';

const DEFAULT_PRESETS = {
  LOW: 1n,
  MEDIUM: 4n,
  HIGH: 6n,
};

const BASE_PRIORITY_FEE_WEI = 500000000n; //0.5 GWei

export async function getNetworkFee(provider: JsonRpcProvider): Promise<NetworkFees | undefined> {
  const { maxFeePerGas: maxFeePerGasInWei } = await provider.getFeeData();
  if (!maxFeePerGasInWei) {
    return undefined;
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
