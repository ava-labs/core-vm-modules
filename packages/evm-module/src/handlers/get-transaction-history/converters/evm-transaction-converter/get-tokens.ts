import type { TransactionDetails } from '@avalabs/glacier-sdk';
import { balanceToDisplayValue } from '@avalabs/utils-sdk';
import { BN } from 'bn.js';
import type { TxToken, NetworkToken } from '@internal/types';
import { TokenType } from '@internal/types';
import { resolve } from '../../utils/resolve';
import { getNftMetadata } from './get-nft-metadata';
import { getSmallImageForNFT } from '../../utils/get-small-image-for-nft';

export const getTokens = async (
  { nativeTransaction, erc20Transfers, erc721Transfers, erc1155Transfers }: TransactionDetails,
  networkToken: NetworkToken,
): Promise<TxToken[]> => {
  const result: TxToken[] = [];

  if (nativeTransaction.value !== '0') {
    const decimal = networkToken.decimals;
    const amountBN = new BN(nativeTransaction.value);
    const amountDisplayValue = balanceToDisplayValue(amountBN, decimal);
    result.push({
      decimal: decimal.toString(),
      name: networkToken.name,
      symbol: networkToken.symbol,
      amount: amountDisplayValue,
      from: nativeTransaction.from,
      to: nativeTransaction.to,
      type: TokenType.NATIVE,
    });
  }

  erc20Transfers?.forEach((erc20Transfer) => {
    const decimals = erc20Transfer.erc20Token.decimals;
    const amountBN = new BN(erc20Transfer.value);
    const amountDisplayValue = balanceToDisplayValue(amountBN, decimals);

    result.push({
      decimal: decimals.toString(),
      name: erc20Transfer.erc20Token.name,
      symbol: erc20Transfer.erc20Token.symbol,
      amount: amountDisplayValue,
      from: erc20Transfer.from,
      to: erc20Transfer.to,
      imageUri: erc20Transfer.erc20Token.logoUri,
      type: TokenType.ERC20,
    });
  });

  if (erc721Transfers) {
    await Promise.all(
      erc721Transfers.map(async (erc721Transfer) => {
        const token = erc721Transfer.erc721Token;
        let imageUri: string;

        if (token.metadata.imageUri) {
          imageUri = token.metadata.imageUri;
        } else {
          const [metadata, error] = await resolve(getNftMetadata(token.tokenUri));
          if (error) {
            imageUri = '';
          } else {
            imageUri = metadata.image ? getSmallImageForNFT(metadata.image) : '';
          }
        }

        result.push({
          name: erc721Transfer.erc721Token.name,
          symbol: erc721Transfer.erc721Token.symbol,
          amount: '1',
          imageUri,
          from: erc721Transfer.from,
          to: erc721Transfer.to,
          collectableTokenId: erc721Transfer.erc721Token.tokenId,
          type: TokenType.ERC721,
        });
      }),
    );
  }

  if (erc1155Transfers) {
    await Promise.all(
      erc1155Transfers.map(async (erc1155Transfer) => {
        const token = erc1155Transfer.erc1155Token;
        let imageUri: string;

        if (token.metadata.imageUri) {
          imageUri = token.metadata.imageUri;
        } else {
          const [metadata, error] = await resolve(getNftMetadata(token.tokenUri));
          if (error) {
            imageUri = '';
          } else {
            imageUri = metadata.image ? getSmallImageForNFT(metadata.image) : '';
          }
        }

        result.push({
          name: erc1155Transfer.erc1155Token.metadata.name ?? '',
          symbol: erc1155Transfer.erc1155Token.metadata.symbol ?? '',
          amount: '1',
          imageUri,
          from: erc1155Transfer.from,
          to: erc1155Transfer.to,
          collectableTokenId: erc1155Transfer.erc1155Token.tokenId,
          type: TokenType.ERC1155,
        });
      }),
    );
  }

  return result;
};
