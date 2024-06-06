import { JsonRpcProvider } from 'ethers';
import type { NetworkFees, Wei } from '@internal/types';

type PresetKeys = 'LOW' | 'MEDIUM' | 'HIGH';

const DEFAULT_PRESETS = {
  LOW: 1n,
  MEDIUM: 4n,
  HIGH: 6n,
};

const BASE_PRIORITY_FEE_WEI = 500000000n; //0.5 GWei

export async function getNetworkFee(
  provider: JsonRpcProvider,
  presetMultipliers: { [T in PresetKeys]: Wei } = DEFAULT_PRESETS,
): Promise<NetworkFees | undefined> {
  const { maxFeePerGas: maxFeePerGasInWei } = await provider.getFeeData();
  if (!maxFeePerGasInWei) {
    return undefined;
  }

  const lowMaxTip = BASE_PRIORITY_FEE_WEI * presetMultipliers.LOW;
  const mediumMaxTip = BASE_PRIORITY_FEE_WEI * presetMultipliers.MEDIUM;
  const highMaxTip = BASE_PRIORITY_FEE_WEI * presetMultipliers.HIGH;
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
