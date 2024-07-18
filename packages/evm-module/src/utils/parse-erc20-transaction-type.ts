import { Interface } from 'ethers';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';
import { ERC20TransactionType } from '../types';

export const parseERC20TransactionType = (transaction: {
  data?: string;
  value?: string;
}): ERC20TransactionType | undefined => {
  if (!transaction.data) {
    return undefined;
  }

  try {
    const contractInterface = new Interface(ERC20.abi);

    const description = contractInterface.parseTransaction({
      data: transaction.data,
      value: transaction.value,
    });

    const functionName = description?.name ?? description?.fragment?.name;

    if (functionName && isERC20TransactionType(functionName)) {
      return functionName;
    }

    return undefined;
  } catch (e) {
    return undefined;
  }
};

function isERC20TransactionType(value: string): value is ERC20TransactionType {
  return Object.values(ERC20TransactionType).includes(value as ERC20TransactionType);
}
