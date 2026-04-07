import type { Network, RpcRequest } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { getProvider } from '../../utils/get-provider';

export const forwardToRpcNode = async (request: RpcRequest, network: Network) => {
  try {
    const provider = await getProvider({
      chainId: network.chainId,
      chainName: network.chainName,
      rpcUrl: network.rpcUrl,
      multiContractAddress: network.utilityAddresses?.multicall,
      pollingInterval: 1000,
      customRpcHeaders: network.customRpcHeaders,
    });

    const response = await provider.send(request.method, request.params as unknown[]);
    return { result: response };
  } catch (error) {
    // extracting the error message based on the error object structure from ethers lib
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = (error as any).info?.error?.message || (error as any).error?.message || (error as Error).message;
    return { error: rpcErrors.internal(message) };
  }
};
