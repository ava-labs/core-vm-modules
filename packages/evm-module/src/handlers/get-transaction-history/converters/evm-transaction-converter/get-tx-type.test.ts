import type { TransactionDetails } from '@avalabs/glacier-sdk';
import { TokenType, TransactionType, type TxToken } from '@avalabs/vm-module-types';
import { getTxType } from './get-tx-type';

const userAddress = '0x1000000000000000000000000000000000000001';
const bridgeContract = '0x5c32d9dac5d16ef5e0ff634da73934e27f1669cc';

function buildErc20FromUserWithUserNativePaymentGlacierDetails(): TransactionDetails {
  return {
    nativeTransaction: {
      chainId: '1',
      from: { address: userAddress },
      to: { address: bridgeContract },
      value: '233715262334053',
      gasLimit: '1',
      nonce: '1',
      txStatus: '1',
      txType: 1,
      blockHash: '0x',
      blockIndex: 1,
      blockNumber: '1',
      blockTimestamp: 1,
      txHash: '0x',
      gasPrice: '1',
      gasUsed: '1',
      method: { methodName: 'ccipSend' },
    },
    erc20Transfers: [
      {
        from: { address: userAddress },
        to: { address: bridgeContract },
        value: '100000',
        erc20Token: {
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          logoUri: '',
        },
      },
    ],
  } as TransactionDetails;
}

describe('getTxType', () => {
  it('classifies ERC-20 from user with user native payment as Bridge', () => {
    const details = buildErc20FromUserWithUserNativePaymentGlacierDetails();
    const tokens: TxToken[] = [
      {
        type: TokenType.NATIVE,
        symbol: 'ETH',
        name: 'Ether',
        amount: '0.000233715262334053',
        decimal: '18',
        from: { address: userAddress },
        to: { address: bridgeContract },
      },
    ];

    expect(getTxType(details, userAddress, tokens)).toBe(TransactionType.BRIDGE);
  });

  it('does not classify pure native send as Bridge', () => {
    const details = {
      nativeTransaction: {
        chainId: '1',
        from: { address: userAddress },
        to: { address: '0xReceiver' },
        value: '1000000000000000000',
        gasLimit: '1',
        nonce: '1',
        txStatus: '1',
        txType: 1,
        blockHash: '0x',
        blockIndex: 1,
        blockNumber: '1',
        blockTimestamp: 1,
        txHash: '0x',
        gasPrice: '1',
        gasUsed: '1',
        method: {},
      },
      erc20Transfers: undefined,
    } as TransactionDetails;

    const tokens: TxToken[] = [
      {
        type: TokenType.NATIVE,
        symbol: 'ETH',
        name: 'Ether',
        amount: '1',
        decimal: '18',
        from: { address: userAddress },
        to: { address: '0xReceiver' },
      },
    ];

    expect(getTxType(details, userAddress, tokens)).toBe(TransactionType.SEND);
  });
});
