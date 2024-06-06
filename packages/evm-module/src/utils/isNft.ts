import { TokenType } from '@internal/types';

export function isNFT(tokenType: TokenType) {
  return tokenType === TokenType.ERC721 || tokenType === TokenType.ERC1155;
}
