import type { WalletIcon } from '@wallet-standard/base';
import type { ChainAgnosticProvider } from '@avalabs/vm-module-types';
import { SolanaCaip2ChainId } from '@avalabs/core-chains-sdk';
import { NetworkVMType, RpcMethod } from '@avalabs/vm-module-types';

import { legacyPublicKey } from './public-key';
import { SolanaWalletProvider } from './provider';

jest.mock('./public-key');

describe('SolanaWalletProvider', () => {
  const mockIcon: WalletIcon = 'data:image/svg+xml;base64,mock-icon';
  const mockVersion = '1.0.0';
  const mockName = 'Mock Wallet';

  const mockAddress = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijk';

  let provider: SolanaWalletProvider;
  let mockChainAgnosticProvider: jest.Mocked<ChainAgnosticProvider>;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(legacyPublicKey).mockReturnValue({ address: mockAddress } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    mockChainAgnosticProvider = {
      request: jest.fn(),
      subscribeToMessage: jest.fn(),
    } as unknown as jest.Mocked<ChainAgnosticProvider>;

    provider = new SolanaWalletProvider(mockChainAgnosticProvider, {
      icon: mockIcon,
      version: mockVersion,
      name: mockName,
    });
  });

  it('initializes with correct info', () => {
    expect(provider.info).toEqual({
      icon: mockIcon,
      version: mockVersion,
      name: mockName,
    });
  });

  it('connects and return public key', async () => {
    mockChainAgnosticProvider.request.mockResolvedValueOnce([mockAddress]);

    const result = await provider.connect();

    expect(mockChainAgnosticProvider.request).toHaveBeenCalledWith({
      data: {
        method: 'wallet_requestAccountPermission',
        params: { addressVM: NetworkVMType.SVM, onlyIfTrusted: undefined },
      },
    });
    expect(result.publicKey).toEqual({ address: mockAddress });
    expect(provider.publicKey).toEqual({ address: mockAddress });
  });

  it('disconnects and emits disconnect event', () => {
    const disconnectSpy = jest.spyOn(provider, 'emit');

    provider.disconnect();

    expect(provider.publicKey).toBeNull();
    expect(disconnectSpy).toHaveBeenCalledWith('disconnect');
  });

  it('signAndSendTransaction() sends proper request through ChainAgnosticProvider', async () => {
    mockChainAgnosticProvider.request.mockResolvedValueOnce('mock-signature');

    const signature = await provider.signAndSendTransaction(
      'mock-account',
      SolanaCaip2ChainId.MAINNET,
      'mock-serialized-tx',
      { skipPreflight: true },
    );

    expect(mockChainAgnosticProvider.request).toHaveBeenCalledWith({
      scope: SolanaCaip2ChainId.MAINNET,
      data: {
        method: RpcMethod.SOLANA_SIGN_AND_SEND_TRANSACTION,
        params: [
          {
            account: 'mock-account',
            serializedTx: 'mock-serialized-tx',
            sendOptions: { skipPreflight: true },
          },
        ],
      },
    });
    expect(signature).toBe('mock-signature');
  });

  it('signTransaction() sends proper request through ChainAgnosticProvider', async () => {
    mockChainAgnosticProvider.request.mockResolvedValueOnce('mock-signed-tx');

    const signedTx = await provider.signTransaction('mock-account', SolanaCaip2ChainId.MAINNET, 'mock-serialized-tx');

    expect(mockChainAgnosticProvider.request).toHaveBeenCalledWith({
      scope: SolanaCaip2ChainId.MAINNET,
      data: {
        method: RpcMethod.SOLANA_SIGN_TRANSACTION,
        params: [
          {
            account: 'mock-account',
            serializedTx: 'mock-serialized-tx',
          },
        ],
      },
    });
    expect(signedTx).toBe('mock-signed-tx');
  });

  it('handles account changes', () => {
    const disconnectSpy = jest.spyOn(provider, 'disconnect');
    const accountChangedSpy = jest.spyOn(provider, 'emit');

    const messageListener = mockChainAgnosticProvider?.subscribeToMessage.mock.calls[0]?.[0];

    messageListener?.({ method: 'accountsChangedCA', params: [{ address: mockAddress, vm: NetworkVMType.SVM }] });

    expect(provider.publicKey).toEqual({ address: mockAddress });
    expect(accountChangedSpy).toHaveBeenCalledWith('connect');

    messageListener?.({ method: 'accountsChangedCA', params: [] });
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('should throw error for unimplemented methods', () => {
    expect(() => provider.signMessage()).toThrow('signMessage() not implemented.');
    expect(() => provider.signIn()).toThrow('signIn() not implemented.');
  });
});
