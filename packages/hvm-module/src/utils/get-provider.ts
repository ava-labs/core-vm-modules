import { HyperSDKClient } from 'hypersdk-client';

type ProviderParams = {
  rpcUrl: string;
  chainName: string;
  vmRpcPrefix?: string;
};

export const getProvider = ({ rpcUrl, chainName, vmRpcPrefix }: ProviderParams): HyperSDKClient => {
  if (!vmRpcPrefix) {
    throw new Error('There is no vm rpc prefix');
  }
  return new HyperSDKClient(rpcUrl, chainName, vmRpcPrefix);
};
