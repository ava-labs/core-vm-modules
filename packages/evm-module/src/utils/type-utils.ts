import {
  TokenType,
  type ERC1155Token,
  type ERC20Token,
  type ERC721Token,
  type NetworkContractToken,
} from '@avalabs/vm-module-types';
import type { RequiredBy, TransactionParams } from '../types';

export function isERC20Token(token: NetworkContractToken): token is ERC20Token {
  return token.type === TokenType.ERC20;
}

export function isNftToken(token: NetworkContractToken): token is ERC1155Token | ERC721Token {
  return token.type === TokenType.ERC1155 || token.type === TokenType.ERC721;
}

export function hasToField(params: TransactionParams): params is RequiredBy<TransactionParams, 'to'> {
  return typeof params.to === 'string';
}
