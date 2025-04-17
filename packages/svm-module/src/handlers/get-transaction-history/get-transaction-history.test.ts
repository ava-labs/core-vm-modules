import { rpcErrors } from '@metamask/rpc-errors';
import { TransactionType, type Network } from '@avalabs/vm-module-types';

import { getExplorerLink } from './get-explorer-link';
import { extractTokenTranfers } from './extract-transfer';
import { getTransactionHistory } from './get-transaction-history';
import { getWrappedTransactions } from './get-wrapped-transactions';

jest.mock('./get-wrapped-transactions');
jest.mock('./extract-transfer');
jest.mock('./get-explorer-link');

describe('src/handlers/get-transaction-history', () => {
  const network = {
    caipId: 'solana:mainnet',
    chainId: '1',
    explorerUrl: 'https://explorer.solana.com',
  } as unknown as Network;
  const address = 'test-address';
  const proxyApiUrl = 'https://proxy.api.url';

  it('should reject if network does not have a caipId', async () => {
    await expect(getTransactionHistory({ network: { ...network, caipId: '' }, address, proxyApiUrl })).rejects.toEqual({
      error: rpcErrors.invalidParams(`Network must have a CAIP-2 id`),
    });
  });

  it('should return transaction history', async () => {
    const rawTransactions = [
      {
        txHash: 'txHash1',
        tx: {
          meta: {
            fee: '1000',
            preBalances: ['1000', '2000'],
            postBalances: ['900', '2100'],
            preTokenBalances: [],
            postTokenBalances: [],
            computeUnitsConsumed: '500',
          },
          transaction: {
            message: {
              accountKeys: ['test-address', 'key2'],
              header: {
                numRequiredSignatures: 1,
              },
            },
          },
          blockTime: '1633024800',
        },
      },
    ];

    (getWrappedTransactions as jest.Mock).mockResolvedValue(rawTransactions);
    (extractTokenTranfers as jest.Mock).mockReturnValue([
      {
        from: { address: 'test-address' },
        to: { address: 'key2' },
      },
    ]);
    (getExplorerLink as jest.Mock).mockReturnValue('https://explorer.solana.com/tx/txHash1');

    const result = await getTransactionHistory({ network, address, proxyApiUrl });

    expect(result).toEqual({
      transactions: [
        {
          hash: 'txHash1',
          txType: TransactionType.SEND,
          gasUsed: '500',
          tokens: [
            {
              from: { address: 'test-address' },
              to: { address: 'key2' },
            },
          ],
          from: 'test-address',
          to: 'key2',
          isOutgoing: true,
          isIncoming: false,
          isSender: true,
          timestamp: 1633024800000,
          isContractCall: false,
          gasPrice: '2',
          chainId: '1',
          explorerLink: 'https://explorer.solana.com/tx/txHash1',
        },
      ],
    });
  });

  it('should recognize swap transactions', async () => {
    const rawTransactions = [
      {
        txHash: 'txHash1',
        tx: {
          meta: {
            fee: '1000',
            preBalances: ['1000', '2000'],
            postBalances: ['900', '2100'],
            preTokenBalances: [
              {
                accountIndex: 1,
                mint: 'some-spl-mint',
                owner: 'some-other-address',
                programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                uiTokenAmount: {
                  amount: '500000',
                  decimals: 5,
                  uiAmount: 5,
                  uiAmountString: '5',
                },
              },
            ],
            postTokenBalances: [
              {
                accountIndex: 0,
                mint: 'some-spl-mint',
                owner: 'ysq96dVZrrMVRassYB2Vr5cHFWoSQDRzQRGNmRRtr1L',
                programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                uiTokenAmount: {
                  amount: '100000',
                  decimals: 5,
                  uiAmount: 1,
                  uiAmountString: '1',
                },
              },
              {
                accountIndex: 1,
                mint: 'some-spl-mint',
                owner: 'some-other-address',
                programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                uiTokenAmount: {
                  amount: '400000',
                  decimals: 5,
                  uiAmount: 5,
                  uiAmountString: '4',
                },
              },
            ],
            computeUnitsConsumed: '500',
          },
          transaction: {
            message: {
              accountKeys: ['test-address', 'some-other-address'],
              header: {
                numRequiredSignatures: 1,
              },
            },
          },
          blockTime: '1633024800',
        },
      },
    ];

    (getWrappedTransactions as jest.Mock).mockResolvedValue(rawTransactions);
    (extractTokenTranfers as jest.Mock).mockReturnValue([
      {
        from: { address: 'test-address' },
        to: { address: 'some-other-address' },
      },
      {
        from: { address: 'some-other-address' },
        to: { address: 'test-address' },
      },
    ]);
    (getExplorerLink as jest.Mock).mockReturnValue('https://explorer.solana.com/tx/txHash1');

    const result = await getTransactionHistory({ network, address, proxyApiUrl });

    expect(result).toEqual({
      transactions: [
        {
          hash: 'txHash1',
          txType: TransactionType.SWAP,
          gasUsed: '500',
          tokens: [
            {
              from: { address: 'test-address' },
              to: { address: 'some-other-address' },
            },
            {
              from: { address: 'some-other-address' },
              to: { address: 'test-address' },
            },
          ],
          from: 'test-address',
          to: 'some-other-address',
          isOutgoing: true,
          isIncoming: false,
          isSender: true,
          timestamp: 1633024800000,
          isContractCall: false,
          gasPrice: '2',
          chainId: '1',
          explorerLink: 'https://explorer.solana.com/tx/txHash1',
        },
      ],
    });
  });

  it('should filter out transactions without meta', async () => {
    const rawTransactions = [
      {
        txHash: 'txHash1',
        tx: {
          meta: null,
          transaction: {
            message: {
              accountKeys: ['key1', 'key2'],
              header: {
                numRequiredSignatures: 1,
              },
            },
          },
          blockTime: '1633024800',
        },
      },
    ];

    (getWrappedTransactions as jest.Mock).mockResolvedValue(rawTransactions);

    const result = await getTransactionHistory({ network, address, proxyApiUrl });

    expect(result).toEqual({
      transactions: [],
    });
  });
});
