import {
  AppName,
  Environment,
  parseManifest,
  RpcMethod,
  type ApprovalController,
  type Network,
  type RpcRequest,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

import ManifestJson from '../manifest.json';
import { SvmModule } from './module';

jest.mock('@solana/rpc', () => ({
  createSolanaRpc: jest.fn().mockReturnValue({}),
}));

const mainnetChainId = 4503599627370463;

describe('SVM Module', () => {
  const svm = new SvmModule({
    approvalController: {} as ApprovalController,
    environment: Environment.DEV,
    appInfo: {
      name: 'tests' as AppName,
      version: '0.0.0',
    },
  });

  describe('getProvider()', () => {
    it('returns an empty object', async () => {
      expect(await svm.getProvider({ chainId: mainnetChainId } as Network)).toEqual({});
    });
  });

  describe('getAddress()', () => {
    it('returns an empty object', async () => {
      expect(await svm.getAddress()).toEqual({});
    });
  });

  describe('getBalances()', () => {
    it('returns an empty object', async () => {
      expect(await svm.getBalances()).toEqual({});
    });
  });

  describe('getManifest()', () => {
    it('returns an empty object', async () => {
      expect(await svm.getManifest()).toEqual(parseManifest(ManifestJson).data);
    });
  });

  describe('getNetworkFee()', () => {
    it('returns an empty object', async () => {
      expect(await svm.getNetworkFee()).toEqual({});
    });
  });

  describe('getTransactionHistory()', () => {
    it('returns an empty history', async () => {
      expect(await svm.getTransactionHistory()).toEqual({ transactions: [] });
    });
  });

  describe('getTokens()', () => {
    it('returns an empty array', async () => {
      expect(await svm.getTokens()).toEqual([]);
    });
  });

  describe('onRpcRequest()', () => {
    it('returns an empty object', async () => {
      expect(
        await svm.onRpcRequest({
          method: 'getGenesisHash' as RpcMethod,
        } as RpcRequest),
      ).toEqual({
        error: rpcErrors.methodNotSupported('Method getGenesisHash not supported'),
      });
    });
  });
});
