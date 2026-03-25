import type { TransactionDetails } from '@avalabs/glacier-sdk';
import { isErc20FromUserWithUserNativePayment } from './is-erc20-from-user-with-user-native-payment';

const user = '0x1000000000000000000000000000000000000001';
const other = '0x0000000000000000000000000000000000000001';

describe('isErc20FromUserWithUserNativePayment', () => {
  it('is true when the user pays msg.value and is the from address on an ERC-20 transfer', () => {
    const nativeTransaction = {
      value: '1',
      from: { address: user },
      to: { address: other },
    } as TransactionDetails['nativeTransaction'];

    const erc20Transfers = [
      {
        from: { address: user },
        to: { address: other },
        value: '100',
        erc20Token: {
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          name: 'USDC',
          symbol: 'USDC',
          decimals: 6,
          logoUri: '',
        },
      },
    ] as TransactionDetails['erc20Transfers'];

    expect(isErc20FromUserWithUserNativePayment(nativeTransaction, erc20Transfers, user)).toBe(true);
  });

  it('is false when the user pays native but no ERC-20 is sent from the user (e.g. ETH-only path into a router)', () => {
    const nativeTransaction = {
      value: '1',
      from: { address: user },
      to: { address: other },
    } as TransactionDetails['nativeTransaction'];

    const erc20Transfers = [
      {
        from: { address: other },
        to: { address: user },
        value: '100',
        erc20Token: {
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          name: 'USDC',
          symbol: 'USDC',
          decimals: 6,
          logoUri: '',
        },
      },
    ] as TransactionDetails['erc20Transfers'];

    expect(isErc20FromUserWithUserNativePayment(nativeTransaction, erc20Transfers, user)).toBe(false);
  });

  it('is false when msg.value is zero', () => {
    const nativeTransaction = {
      value: '0',
      from: { address: user },
      to: { address: other },
    } as TransactionDetails['nativeTransaction'];

    const erc20Transfers = [
      {
        from: { address: user },
        to: { address: other },
        value: '100',
        erc20Token: {
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          name: 'USDC',
          symbol: 'USDC',
          decimals: 6,
          logoUri: '',
        },
      },
    ] as TransactionDetails['erc20Transfers'];

    expect(isErc20FromUserWithUserNativePayment(nativeTransaction, erc20Transfers, user)).toBe(false);
  });
});
