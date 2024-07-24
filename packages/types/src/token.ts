export enum TokenType {
  NATIVE = 'NATIVE',
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
  NONERC = 'NONERC',
}

export interface NetworkToken {
  name: string;
  symbol: string;
  decimals: number;
  logoUri?: string;
  description?: string;
}

export type NetworkContractToken = ERC20Token | ERC1155Token | ERC721Token | NONERCToken;

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
