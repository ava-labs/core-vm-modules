import { HyperSDKClient } from 'hypersdk-client/src/index';

type ProviderParams = {
  rpcUrl: string;
  chainName: string;
  vmRpcPrefix: string;
};

export const getProvider = async ({ rpcUrl, chainName, vmRpcPrefix }: ProviderParams): Promise<HyperSDKClient> =>
  new HyperSDKClient(rpcUrl, chainName, vmRpcPrefix);
