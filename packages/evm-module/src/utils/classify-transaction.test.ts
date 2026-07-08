import { Interface } from 'ethers';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';

import { TransactionKind } from '../types';
import { classifyTransaction } from './classify-transaction';

const iface = new Interface(ERC20.abi);

const RECIPIENT_ADDRESS = '0x2222222222222222222222222222222222222222';
const FROM_ADDRESS = '0x3333333333333333333333333333333333333333';

describe('classifyTransaction', () => {
  it('classifies a transaction without calldata as a native transfer', () => {
    expect(classifyTransaction({ value: '0x1' })).toBe(TransactionKind.NATIVE_TRANSFER);
  });

  it('classifies a transaction with empty `0x` calldata as a native transfer', () => {
    expect(classifyTransaction({ data: '0x', value: '0x1' })).toBe(TransactionKind.NATIVE_TRANSFER);
  });

  it('classifies ERC20 `transfer` calldata as an ERC20 transfer', () => {
    const data = iface.encodeFunctionData('transfer', [RECIPIENT_ADDRESS, 1000n]);

    expect(classifyTransaction({ data })).toBe(TransactionKind.ERC20_TRANSFER);
  });

  it('classifies ERC20 `transferFrom` calldata as an ERC20 transfer', () => {
    const data = iface.encodeFunctionData('transferFrom', [FROM_ADDRESS, RECIPIENT_ADDRESS, 1000n]);

    expect(classifyTransaction({ data })).toBe(TransactionKind.ERC20_TRANSFER);
  });

  it('classifies ERC20 `approve` calldata as a contract call', () => {
    const data = iface.encodeFunctionData('approve', [RECIPIENT_ADDRESS, 1000n]);

    expect(classifyTransaction({ data })).toBe(TransactionKind.CONTRACT_CALL);
  });

  it('classifies unknown calldata as a contract call', () => {
    expect(classifyTransaction({ data: '0xdeadbeef' })).toBe(TransactionKind.CONTRACT_CALL);
  });
});
