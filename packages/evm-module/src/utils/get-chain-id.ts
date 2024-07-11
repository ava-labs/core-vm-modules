import type { Caip2ChainId } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';

export const getChainId = (caip2ChainId: Caip2ChainId): number => {
  const chainId = caip2ChainId.split(':')[1];

  if (!chainId || isNaN(Number(chainId))) {
    throw rpcErrors.invalidParams('Invalid chainId');
  }

  return Number(chainId);
};
