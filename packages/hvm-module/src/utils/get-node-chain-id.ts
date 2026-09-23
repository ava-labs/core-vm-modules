import { idStringToBigInt } from 'hypersdk-client';

type NetworkParams = {
  rpcUrl: string;
  chainName: string;
};

type NetworkInfo = {
  networkId: number;
  subnetId: string;
  chainId: string;
};

const TIMEOUT_MS = 10_000;

// Fetches the chain id from a node's coreapi endpoint. The chain id is returned as a decimal string, which is converted to a bigint.
export const getNodeChainId = async ({ rpcUrl, chainName }: NetworkParams): Promise<bigint> => {
  const response = await fetch(`${rpcUrl}/ext/bc/${chainName}/coreapi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'hypersdk.network', params: {}, id: 1 }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const json = await response.json();

  if (json?.error?.message) {
    throw new Error(json.error.message);
  }

  const chainId = (json?.result as NetworkInfo | undefined)?.chainId;

  if (!chainId) {
    throw new Error('The node did not return a chain id');
  }

  return idStringToBigInt(chainId);
};

// Parses a chain id string (decimal or hex) into a bigint. Returns null if the string is not a valid chain id.
export const parseRequestChainId = (chainId: string): bigint | null => {
  try {
    return /^\d+$/.test(chainId) ? BigInt(chainId) : idStringToBigInt(chainId);
  } catch {
    return null;
  }
};
