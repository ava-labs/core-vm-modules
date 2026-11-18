import { AppName, Environment, NetworkVMType, type RpcMethod } from '@avalabs/vm-module-types';
import { providerErrors, rpcErrors } from '@metamask/rpc-errors';
import ManifestJson from '../manifest.json';
import { EvmModule } from './module';
import { forwardToRpcNode } from './handlers/forward-to-rpc-node/forward-to-rpc-node';

// The address derivation handlers pull in WASM crypto that isn't needed here.
jest.mock('./handlers/derive-addresses/derive-addresses', () => ({ deriveAddresses: jest.fn() }));
jest.mock('./handlers/derive-address/derive-address', () => ({ deriveAddress: jest.fn() }));
jest.mock('./handlers/forward-to-rpc-node/forward-to-rpc-node', () => ({
  forwardToRpcNode: jest.fn().mockResolvedValue({ result: '0xforwarded' }),
}));

const network = {
  isTestnet: false,
  chainId: 1,
  chainName: 'Ethereum',
  rpcUrl: 'https://rpc.example',
  logoUri: '',
  networkToken: { name: 'Ether', symbol: 'ETH', decimals: 18, description: '', logoUri: '' },
  vmName: NetworkVMType.EVM,
};

const request = (method: string, params: unknown[] = []) => ({
  requestId: '1',
  sessionId: '1',
  chainId: 'eip155:1',
  method: method as RpcMethod,
  params,
  dappInfo: { name: 'dApp', url: 'https://example.com', icon: '' },
});

const createModule = () =>
  new EvmModule({
    environment: Environment.PRODUCTION,
    appInfo: { name: AppName.CORE_MOBILE_IOS, version: '1.0.0' },
    approvalController: {} as never,
    runtime: { getAuthHeaders: async () => ({}) },
  });

describe('EvmModule.onRpcRequest', () => {
  it.each([
    ['eth_decrypt', ['0x7b2276657273696f6e223a22783235353139...', '0x0000000000000000000000000000000000000001']],
    ['eth_getEncryptionPublicKey', ['0x0000000000000000000000000000000000000001']],
  ])('rejects %s locally with EIP-1193 4200 instead of forwarding it to the RPC node', async (method, params) => {
    const response = await createModule().onRpcRequest(request(method, params), network);

    expect(response).toEqual({ error: providerErrors.unsupportedMethod(`Method ${method} is not supported`) });
    expect((response as { error: { code: number } }).error.code).toBe(4200);
    expect(forwardToRpcNode).not.toHaveBeenCalled();
  });

  it.each(['eth_call', 'eth_getBalance', 'eth_chainId', 'eth_blockNumber', 'net_version', 'web3_clientVersion'])(
    'still forwards the read-only method %s to the RPC node',
    async (method) => {
      const response = await createModule().onRpcRequest(request(method), network);

      expect(forwardToRpcNode).toHaveBeenCalledWith(expect.objectContaining({ method }), network);
      expect(response).toEqual({ result: '0xforwarded' });
    },
  );

  it('rejects other unknown methods as before', async () => {
    const response = await createModule().onRpcRequest(request('wallet_unknownMethod'), network);

    expect(response).toEqual({ error: rpcErrors.methodNotSupported('Method wallet_unknownMethod not supported') });
    expect(forwardToRpcNode).not.toHaveBeenCalled();
  });

  it('keeps the methods in the manifest so consumers route them to the module for the local rejection', () => {
    expect(ManifestJson.permissions.rpc.nonRestrictedMethods).toEqual(
      expect.arrayContaining(['eth_decrypt', 'eth_getEncryptionPublicKey']),
    );
  });
});
