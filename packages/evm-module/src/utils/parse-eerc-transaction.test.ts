import { Interface } from 'ethers';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';

import { EERC_ABI } from './eerc-abi';
import { EercOperation, parseEercTransaction } from './parse-eerc-transaction';

const eerc = new Interface(EERC_ABI);
const erc20 = new Interface(ERC20.abi);

const ADDRESS = '0x0000000000000000000000000000000000000001';
const proofPoints = [
  [0n, 0n],
  [
    [0n, 0n],
    [0n, 0n],
  ],
  [0n, 0n],
];
const signals = (length: number) => new Array(length).fill(0n);
const pct7 = signals(7);

describe('parseEercTransaction', () => {
  it.each([
    [
      'register(((uint256[2],uint256[2][2],uint256[2]),uint256[5]))',
      [[proofPoints, signals(5)]],
      EercOperation.REGISTER,
    ],
    ['deposit(uint256,address,uint256[7])', [1n, ADDRESS, pct7], EercOperation.DEPOSIT],
    ['deposit(uint256,address,uint256[7],bytes)', [1n, ADDRESS, pct7, '0x'], EercOperation.DEPOSIT],
    [
      'transfer(address,uint256,((uint256[2],uint256[2][2],uint256[2]),uint256[32]),uint256[7])',
      [ADDRESS, 1n, [proofPoints, signals(32)], pct7],
      EercOperation.TRANSFER,
    ],
    [
      'withdraw(uint256,((uint256[2],uint256[2][2],uint256[2]),uint256[16]),uint256[7])',
      [1n, [proofPoints, signals(16)], pct7],
      EercOperation.WITHDRAW,
    ],
    [
      'privateMint(address,((uint256[2],uint256[2][2],uint256[2]),uint256[24]))',
      [ADDRESS, [proofPoints, signals(24)]],
      EercOperation.PRIVATE_MINT,
    ],
    ['setAuditorPublicKey(address)', [ADDRESS], EercOperation.SET_AUDITOR_PUBLIC_KEY],
  ])('recognizes %s as %s', (signature, args, expected) => {
    const data = eerc.encodeFunctionData(signature, args);

    expect(parseEercTransaction({ data })).toEqual({ operation: expected });
  });

  it('returns undefined for a standard ERC20 transfer', () => {
    const data = erc20.encodeFunctionData('transfer', [ADDRESS, 1000n]);

    expect(parseEercTransaction({ data })).toBeUndefined();
  });

  it('returns undefined for empty calldata', () => {
    expect(parseEercTransaction({ data: '0x' })).toBeUndefined();
    expect(parseEercTransaction({})).toBeUndefined();
  });

  it('returns undefined for an unknown selector', () => {
    expect(parseEercTransaction({ data: '0xdeadbeef' })).toBeUndefined();
  });
});
