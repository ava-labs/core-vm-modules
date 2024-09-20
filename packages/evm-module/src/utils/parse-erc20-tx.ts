import xss from 'xss';
import { ethers } from 'ethers';
import { TokenType } from '@avalabs/vm-module-types';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';
import type { JsonRpcBatchInternal } from '@avalabs/core-wallets-sdk';

import type { TransactionParams } from '../types';

export const parseWithErc20Abi = async (params: TransactionParams, chainId: number, provider: JsonRpcBatchInternal) => {
  if (!params.data) {
    return {
      tokenApprovals: undefined,
      balanceChange: undefined,
    };
  }

  try {
    const contract = new ethers.Contract(params.to, ERC20.abi, provider);
    const contractCalls = await Promise.all([contract.name?.(), contract.symbol?.(), contract.decimals?.()]);
    // Purify the values for XSS protection
    const name = xss(contractCalls[0]);
    const symbol = xss(contractCalls[1]);
    const decimals = parseInt(contractCalls[2]);
    const token = {
      type: TokenType.ERC20,
      name,
      chainId,
      symbol,
      decimals,
      address: params.to,
      contractType: 'ERC-20',
    } as const;

    const iface = new ethers.Interface(ERC20.abi);
    const calledFunction = iface.getFunction(params.data.slice(0, 10));

    const decodeFunctionData = iface.decodeFunctionData(params.data.slice(0, 10), params.data);
    if (calledFunction?.name === 'transfer') {
      return {
        balanceChange: {
          outs: [
            {
              items: [
                {
                  displayValue: new TokenUnit(decodeFunctionData['amount'], token.decimals, token.symbol).toDisplay(),
                  usdPrice: undefined,
                },
              ],
              token,
            },
          ],
          ins: [],
        },
      };
    } else if (calledFunction?.name === 'approve') {
      return {
        tokenApprovals: {
          isEditable: true,
          approvals: [
            {
              token,
              spenderAddress: decodeFunctionData['spender'],
              value: decodeFunctionData['amount'],
            },
          ],
        },
      };
    }
  } catch (error) {
    console.error('processTransactionSimulation error while parsing ERC20', error);
  }

  return {
    tokenApprovals: undefined,
    balanceChange: undefined,
  };
};
