import { HyperSDKClient } from 'hypersdk-client';
import { getProvider } from './get-provider';

jest.mock('hypersdk-client');

describe('packages/hvm-module/src/utils/get-provider', () => {
  it('throws errors if vmRpcPrefix is missing', async () => {
    expect(() => getProvider({ rpcUrl: 'rpcURL', chainName: 'HVM-chain' })).toThrow('There is no vm rpc prefix');
  });

  it('returns a new HyperSDKClient insteance', () => {
    expect(getProvider({ rpcUrl: 'rpcURL', chainName: 'HVM-chain', vmRpcPrefix: 'vmRpcPrefix' })).toBeInstanceOf(
      HyperSDKClient,
    );

    expect(HyperSDKClient).toHaveBeenCalledWith('rpcURL', 'HVM-chain', 'vmRpcPrefix');
  });
});
