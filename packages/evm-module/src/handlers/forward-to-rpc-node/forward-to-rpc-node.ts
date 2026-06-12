import type { Network, RpcRequest } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { getProvider } from '../../utils/get-provider';

export const forwardToRpcNode = async (request: RpcRequest, network: Network) => {
  try {
    // IMPORTANT: do NOT pass `multiContractAddress` here. It makes the provider
    // transparently re-route eth_calls through Multicall3's `aggregate`, which
    // rewrites `msg.sender` to the Multicall3 contract. For dApp reads that depend
    // on the caller (e.g. Uniswap-style `collect`, permit/allowance checks,
    // owner-gated views) that breaks the call — it reverts as "Multicall3: call
    // failed" even though the same call succeeds as a direct eth_call with the
    // dApp-provided `from`. We are a verbatim passthrough for dApp requests, so
    // each call must hit the node as-is to preserve caller semantics.
    const provider = await getProvider({
      chainId: network.chainId,
      chainName: network.chainName,
      rpcUrl: network.rpcUrl,
      pollingInterval: 1000,
      customRpcHeaders: network.customRpcHeaders,
    });

    const response = await provider.send(request.method, request.params as unknown[]);
    return { result: response };
  } catch (error) {
    // For read methods we are a transparent RPC passthrough, so relay the node's
    // original JSON-RPC error verbatim — its `code` (e.g. 3 = execution reverted),
    // `message` and revert `data`. ethers stores that raw payload under
    // `error.info.error` for a reverted call. Re-coding it as a generic internal
    // error (-32603) or stripping `data`/`code` makes dApps treat an *expected*
    // revert (e.g. eth_call/eth_estimateGas fee & quote simulations) as a fatal
    // failure instead of decoding the revert reason like a direct RPC connection
    // would.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpcError = (error as any).info?.error ?? (error as any).error;
    if (rpcError && typeof rpcError.code === 'number') {
      return { error: rpcError };
    }

    return { error: rpcErrors.internal((error as Error).message) };
  }
};
