import { Interface } from 'ethers';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';

import { getRecipientAddress } from './get-recipient-address';

const iface = new Interface(ERC20.abi);

const CONTRACT_ADDRESS = '0x1111111111111111111111111111111111111111';
const RECIPIENT_ADDRESS = '0x2222222222222222222222222222222222222222';
const FROM_ADDRESS = '0x3333333333333333333333333333333333333333';

describe('getRecipientAddress', () => {
  it('returns the transaction `to` for a native transfer (no data)', () => {
    expect(getRecipientAddress({ to: RECIPIENT_ADDRESS, value: '0x1' })).toBe(RECIPIENT_ADDRESS);
  });

  it('returns the transaction `to` when data is not a parseable ERC20 call', () => {
    expect(getRecipientAddress({ to: CONTRACT_ADDRESS, data: '0xdeadbeef' })).toBe(CONTRACT_ADDRESS);
  });

  it('decodes the recipient from ERC20 `transfer` calldata', () => {
    const data = iface.encodeFunctionData('transfer', [RECIPIENT_ADDRESS, 1000n]);

    expect(getRecipientAddress({ to: CONTRACT_ADDRESS, data })).toBe(RECIPIENT_ADDRESS);
  });

  it('decodes the recipient from ERC20 `transferFrom` calldata', () => {
    const data = iface.encodeFunctionData('transferFrom', [FROM_ADDRESS, RECIPIENT_ADDRESS, 1000n]);

    expect(getRecipientAddress({ to: CONTRACT_ADDRESS, data })).toBe(RECIPIENT_ADDRESS);
  });

  it('falls back to the transaction `to` for non-transfer ERC20 calls (e.g. approve)', () => {
    const data = iface.encodeFunctionData('approve', [RECIPIENT_ADDRESS, 1000n]);

    expect(getRecipientAddress({ to: CONTRACT_ADDRESS, data })).toBe(CONTRACT_ADDRESS);
  });

  it('returns undefined when there is no `to` and data is not a transfer', () => {
    expect(getRecipientAddress({ data: '0xdeadbeef' })).toBeUndefined();
  });
});
