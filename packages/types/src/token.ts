export enum TokenType {
  NATIVE = 'NATIVE',
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
  NONERC = 'NONERC',
  SPL = 'SPL',
}

export interface NetworkToken {
  name: string;
  symbol: string;
  decimals: number;
  logoUri?: string;
  description?: string;
}

export type NetworkContractToken = ERC20Token | ERC1155Token | ERC721Token | NONERCToken | SPLToken;

export interface ERC20Token {
  address: string;
  chainId?: number;
  color?: string;
  type: TokenType.ERC20;
  decimals: number;
  logoUri?: string;
  name: string;
  symbol: string;
}

export interface SPLToken {
  address: string;
  name: string;
  symbol: string;
  type: TokenType.SPL;
  caip2Id: string;
  decimals: number;
  chainId?: number;
  logoUri?: string;
  color?: string;
}

export interface ERC1155Token {
  address: string;
  type: TokenType.ERC1155;
  logoUri?: string;
  name?: string;
  symbol?: string;
}

export interface ERC721Token {
  address: string;
  type: TokenType.ERC721;
  logoUri?: string;
  name?: string;
  symbol?: string;
}

export interface NONERCToken {
  address: string;
  type: TokenType.NONERC;
  logoUri?: string;
  name?: string;
  symbol?: string;
}
