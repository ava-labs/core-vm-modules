/**
 * Tells whether a request-supplied `chainId` refers to the network Core is connected to.
 *
 * The chain id is part of the signed transaction but never appears on the approval screen -
 * the UI shows the name of the connected network - so a transaction naming another chain
 * would be approved as if it targeted the one the user is looking at. The simulation results
 * shown alongside it are produced against the connected chain too, which makes the displayed
 * balance changes describe a different chain than the signature binds.
 *
 * Callers may express the id as a number, a decimal string or a 0x-prefixed hex string.
 */
export const isMatchingChainId = (requested: string | number | undefined, networkChainId: number): boolean => {
  if (requested === undefined || requested === '') {
    // Not provided: the transaction is built for the connected network.
    return true;
  }

  if (typeof requested === 'number') {
    return requested === networkChainId;
  }

  const isHex = requested.startsWith('0x') || requested.startsWith('0X');

  if (!isHex && !/^\d+$/.test(requested)) {
    return false;
  }

  try {
    return BigInt(requested) === BigInt(networkChainId);
  } catch {
    return false;
  }
};
