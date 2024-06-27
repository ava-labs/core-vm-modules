export interface NetworkToken {
  name: string;
  symbol: string;
  decimals: number;
  logoUri?: string;
  description?: string;
}

export interface NetworkContractToken {
  address: string;
  chainId?: number;
  color?: string;
  contractType: string;
  decimals: number;
  logoUri?: string;
  name: string;
  symbol: string;
}

export enum TokenType {
  NATIVE = 'NATIVE',
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
}
