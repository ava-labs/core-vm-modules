import { ethers } from 'ethers';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';
import { ERC20TransactionType } from '../types';

export function encodeApprovalLimit(tokenAddress: string, spenderAddress: string, limit: string) {
  const contract = new ethers.Contract(tokenAddress, ERC20.abi);

  return contract.interface.encodeFunctionData(ERC20TransactionType.APPROVE, [spenderAddress, limit]);
}
