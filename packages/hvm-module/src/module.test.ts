import {
  NetworkVMType,
  parseManifest,
  RpcMethod,
  type ConstructorParams,
  type DappInfo,
  type Network,
  type NetworkTokenWithBalance,
} from '@avalabs/vm-module-types';
import { HvmModule } from './module';
import { getProvider } from './utils/get-provider';
import type { HyperSDKClient } from 'hypersdk-client';
import { ZodError } from 'zod';
import { hvmGetBalances } from './handlers/get-balances';
import { rpcErrors } from '@metamask/rpc-errors';
import { hvmSign } from './handlers/sign-transaction/sign-transaction';

jest.mock('@avalabs/vm-module-types', () => {
  const actual = jest.requireActual('@avalabs/vm-module-types');

  return {
    ...actual,
    parseManifest: jest.fn(),
  };
});
jest.mock('./utils/get-provider');
jest.mock('./handlers/get-balances');
jest.mock('./handlers/sign-transaction/sign-transaction');

const mockNetwork: Network = {
  chainId: 1,
  chainName: 'example',
  rpcUrl: 'https://rpc.example',
  vmName: NetworkVMType.HVM,
  vmRpcPrefix: 'hvm',
  networkToken: {
    name: 'COIN',
    symbol: 'COIN',
    decimals: 9,
  },
};

describe('packages/hvm-module/src/module', () => {
  describe('getProvider', () => {
    it('returns the provider for the network', async () => {
      const mockProvider = { provider: 'yes' };
      jest.mocked(getProvider).mockReturnValue(mockProvider as unknown as HyperSDKClient);

      const module = new HvmModule({ approvalController: {} } as ConstructorParams);
      await expect(module.getProvider(mockNetwork)).resolves.toBe(mockProvider);

      expect(getProvider).toHaveBeenCalledWith(mockNetwork);
    });

    it('rejects when getProvider throws an error', async () => {
      jest.mocked(getProvider).mockImplementation(() => {
        throw new Error('Provider creation error');
      });

      const module = new HvmModule({ approvalController: {} } as ConstructorParams);
      await expect(module.getProvider(mockNetwork)).rejects.toEqual(new Error('Provider creation error'));
    });
  });

  describe('getManifest', () => {
    it('returns the manifest', () => {
      jest.mocked(parseManifest).mockReturnValue({
        success: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { name: 'HVM' } as any,
      });

      const module = new HvmModule({ approvalController: {} } as ConstructorParams);
      expect(module.getManifest()).toEqual({ name: 'HVM' });
    });

    it('returns undefined when parsing fails', () => {
      jest.mocked(parseManifest).mockReturnValue({
        success: false,
        error: { message: 'parsing error' } as ZodError,
      });

      const module = new HvmModule({ approvalController: {} } as ConstructorParams);
      expect(module.getManifest()).toEqual(undefined);
    });
  });

  describe('getAddress', () => {
    it('throws a not implemented error', () => {
      const module = new HvmModule({ approvalController: {} } as ConstructorParams);
      expect(module.getAddress).toThrow('not implemented');
    });
  });

  describe('getBalances', () => {
    it('returns balances', async () => {
      const mockResponse = { address1: { COIN: { symbol: 'COIN', balance: 2n } as NetworkTokenWithBalance } };
      jest.mocked(hvmGetBalances).mockResolvedValue(mockResponse);

      const module = new HvmModule({ approvalController: {} } as ConstructorParams);
      await expect(
        module.getBalances({ addresses: ['address1', 'address2'], network: mockNetwork, currency: 'usd' }),
      ).resolves.toBe(mockResponse);
    });

    it('rejects with error', async () => {
      jest.mocked(hvmGetBalances).mockRejectedValue(new Error('failed to fetch balances'));

      const module = new HvmModule({ approvalController: {} } as ConstructorParams);
      await expect(
        module.getBalances({ addresses: ['address1', 'address2'], network: mockNetwork, currency: 'usd' }),
      ).rejects.toEqual(new Error('failed to fetch balances'));
    });
  });

  describe('onRpcRequest', () => {
    it('resolves with error on unknown RPC method', async () => {
      const module = new HvmModule({ approvalController: {} } as ConstructorParams);
      await expect(
        module.onRpcRequest(
          {
            method: 'GIMME_DATA' as RpcMethod,
            params: [],
            sessionId: '1',
            dappInfo: {} as DappInfo,
            requestId: '1',
            chainId: 'hvm:1',
          },
          mockNetwork,
        ),
      ).resolves.toEqual({ error: rpcErrors.methodNotSupported('Method GIMME_DATA not supported') });
    });

    it('handles HVM_SIGN_TRANSACTION', async () => {
      jest.mocked(hvmSign).mockResolvedValue({ result: 'signature' });

      const module = new HvmModule({ approvalController: {} } as ConstructorParams);
      await expect(
        module.onRpcRequest(
          {
            method: RpcMethod.HVM_SIGN_TRANSACTION,
            params: [],
            sessionId: '1',
            dappInfo: {} as DappInfo,
            requestId: '1',
            chainId: 'hvm:1',
          },
          mockNetwork,
        ),
      ).resolves.toEqual({ result: 'signature' });
    });
  });

  describe('getTransactionHistory', () => {
    it('resolves with empty list', async () => {
      const module = new HvmModule({ approvalController: {} } as ConstructorParams);
      await expect(
        module.getTransactionHistory({
          address: 'address1',
          network: mockNetwork,
        }),
      ).resolves.toEqual({ transactions: [] });
    });
  });

  describe('getTokens', () => {
    it('resolves with empty list', async () => {
      const module = new HvmModule({ approvalController: {} } as ConstructorParams);
      await expect(module.getTokens(mockNetwork)).resolves.toEqual([]);
    });
  });

  describe('getNetworkFee', () => {
    it('rejects with error', async () => {
      const module = new HvmModule({ approvalController: {} } as ConstructorParams);
      await expect(module.getNetworkFee(mockNetwork)).rejects.toEqual(new Error('not implemented'));
    });
  });
});
