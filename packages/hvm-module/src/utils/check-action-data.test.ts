import type { VMABI } from 'hypersdk-client';
import { findActionDataMismatches } from './check-action-data';

const abi: VMABI = {
  actions: [
    { id: 1, name: 'Transfer' },
    { id: 2, name: 'Vote' },
  ],
  outputs: [{ id: 3, name: 'TransferResult' }],
  types: [
    {
      name: 'Transfer',
      fields: [
        { name: 'to', type: 'Address' },
        { name: 'value', type: 'uint64' },
        { name: 'memo', type: '[]uint8' },
      ],
    },
    {
      name: 'Vote',
      fields: [
        { name: 'approved', type: 'bool' },
        { name: 'weights', type: '[]uint64' },
        { name: 'options', type: 'Option' },
      ],
    },
    {
      name: 'Option',
      fields: [{ name: 'label', type: 'string' }],
    },
  ],
};

const address = `0x${'ab'.repeat(37)}`;

const transfer = (data: Record<string, unknown>) => [{ actionName: 'Transfer', data }];

describe('findActionDataMismatches', () => {
  it('reports nothing for a well-formed action', () => {
    expect(findActionDataMismatches(transfer({ to: address, value: '1000', memo: 'aGVsbG8=' }), abi)).toEqual([]);
  });

  it('accepts integers as numbers as well as strings', () => {
    expect(findActionDataMismatches(transfer({ to: address, value: 1000, memo: '' }), abi)).toEqual([]);
  });

  it('flags a string used for a bool field, which would be signed as true', () => {
    const result = findActionDataMismatches(
      [{ actionName: 'Vote', data: { approved: 'false', weights: [], options: { label: 'a' } } }],
      abi,
    );

    expect(result).toEqual([expect.stringContaining('approved')]);
  });

  it('flags a field that is missing from the action data', () => {
    const result = findActionDataMismatches(transfer({ to: address, memo: '' }), abi);

    expect(result).toEqual([expect.stringContaining('value')]);
  });

  it('flags a field that the ABI does not declare', () => {
    const result = findActionDataMismatches(transfer({ to: address, value: '1', memo: '', bonus: 'shown only' }), abi);

    expect(result).toEqual([expect.stringContaining('bonus')]);
  });

  it('flags integers outside the declared range', () => {
    expect(findActionDataMismatches(transfer({ to: address, value: '-1', memo: '' }), abi)).toEqual([
      expect.stringContaining('value'),
    ]);

    expect(findActionDataMismatches(transfer({ to: address, value: '18446744073709551616', memo: '' }), abi)).toEqual([
      expect.stringContaining('value'),
    ]);
  });

  it('flags a malformed address', () => {
    const result = findActionDataMismatches(transfer({ to: '0x1234', value: '1', memo: '' }), abi);

    expect(result).toEqual([expect.stringContaining('to')]);
  });

  it('flags a byte slice that is not base64', () => {
    const result = findActionDataMismatches(transfer({ to: address, value: '1', memo: '0xdeadbeef' }), abi);

    expect(result).toEqual([expect.stringContaining('memo')]);
  });

  it('recurses into slices and nested structs', () => {
    const result = findActionDataMismatches(
      [{ actionName: 'Vote', data: { approved: true, weights: ['1', 'not-a-number'], options: { label: 2 } } }],
      abi,
    );

    expect(result).toEqual([expect.stringContaining('weights[1]'), expect.stringContaining('options.label')]);
  });

  it('flags an action that the chain does not have', () => {
    const result = findActionDataMismatches([{ actionName: 'Drain', data: {} }], abi);

    expect(result).toEqual([expect.stringContaining('does not exist on this chain')]);
  });

  it('flags an action without field definitions in the ABI', () => {
    const abiWithoutType: VMABI = { ...abi, types: abi.types.filter(({ name }) => name !== 'Transfer') };

    const result = findActionDataMismatches(transfer({ to: address, value: '1', memo: '' }), abiWithoutType);

    expect(result).toEqual([expect.stringContaining('no field definition')]);
  });

  it('reports mismatches from every action, not just the first', () => {
    const result = findActionDataMismatches(
      [
        { actionName: 'Transfer', data: { to: address, value: 'nope', memo: '' } },
        { actionName: 'Vote', data: { approved: 1, weights: [], options: { label: 'a' } } },
      ],
      abi,
    );

    expect(result).toEqual([expect.stringContaining('actions[0]'), expect.stringContaining('actions[1]')]);
  });
});
