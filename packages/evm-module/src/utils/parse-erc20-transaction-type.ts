import { Interface } from 'ethers';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';

export const parseERC20TransactionType = (transaction: { data?: string; value?: string }): string | undefined => {
  if (!transaction.data) {
    return undefined;
  }

  try {
    const contractInterface = new Interface(ERC20.abi);

    const description = contractInterface.parseTransaction({
      data: transaction.data,
      value: transaction.value,
    });

    return (description?.name ?? description?.fragment?.name)?.toUpperCase();
  } catch (e) {
    console.error(e);
    return undefined;
  }
};
