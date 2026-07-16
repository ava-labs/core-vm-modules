import {
  AppName,
  Environment,
  NetworkVMType,
  type ApprovalController,
  type ConstructorParams,
  type Network,
} from '@avalabs/vm-module-types';
import { HypercoreModule } from './module';

// Short-circuit the @avalabs/crypto-wasm peer-resolution chain.
jest.mock('@avalabs/crypto-sdk', () => ({}));
import { HYPERCORE_CAIP_ID, HYPERCORE_CHAIN_ID } from './constants';

const mockNetwork: Network = {
  chainId: HYPERCORE_CHAIN_ID,
  caipId: HYPERCORE_CAIP_ID,
  chainName: 'HyperCore',
  rpcUrl: '',
  networkToken: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 8,
  },
  vmName: NetworkVMType.HYPERCORE,
  explorerUrl: 'https://app.hyperliquid.xyz/explorer',
};

const approvalController = {
  requestPublicKey: jest.fn(),
} as unknown as ApprovalController;

const constructorParams: ConstructorParams = {
  environment: Environment.DEV,
  approvalController,
  appInfo: { name: AppName.OTHER, version: '0.0.0' },
};

describe('HypercoreModule', () => {
  const module = new HypercoreModule(constructorParams);

  it('exposes a manifest for hlcore:mainnet', () => {
    const manifest = module.getManifest();
    expect(manifest?.network.chainIds).toContain(HYPERCORE_CAIP_ID);
    expect(manifest?.network.namespaces).toContain('hlcore');
    expect(manifest?.permissions.rpc.dapps).toBe(false);
    expect(manifest?.permissions.rpc.methods).toEqual([]);
  });

  it('rejects getProvider', async () => {
    await expect(module.getProvider(mockNetwork)).rejects.toThrow(/does not support getProvider/);
  });

  it('rejects getNetworkFee', async () => {
    await expect(module.getNetworkFee(mockNetwork)).rejects.toThrow(/does not support getNetworkFee/);
  });

  it('returns methodNotSupported for onRpcRequest', async () => {
    const result = await module.onRpcRequest(
      {
        method: 'eth_sendTransaction' as never,
        params: [],
        requestId: '1',
        sessionId: '1',
        chainId: HYPERCORE_CAIP_ID,
        dappInfo: { name: 'test', url: 'https://example.com', icon: '' },
      },
      mockNetwork,
    );
    expect('error' in result && result.error).toBeTruthy();
  });

  it('builds EVM-style derivation paths keyed as HYPERCORE', () => {
    expect(module.buildDerivationPath({ accountIndex: 0, derivationPathType: 'bip44' })).toEqual({
      [NetworkVMType.HYPERCORE]: "m/44'/60'/0'/0/0",
    });
  });
});
