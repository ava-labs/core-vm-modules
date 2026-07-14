/**
 * Loud failure message for HyperCore capabilities that do not exist (no RPC, no gas).
 * Prefer rejecting with this over empty success so clients and agents see intentional gaps.
 */
export const unsupportedHypercoreCapabilityMessage = (capability: string) =>
  `HyperCore does not support ${capability}: read-only module (balances, tokens, activity).`;

export const unsupportedHypercoreCapability = (capability: string): never => {
  throw new Error(unsupportedHypercoreCapabilityMessage(capability));
};
