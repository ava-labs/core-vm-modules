import type { TransactionDetails } from '@avalabs/glacier-sdk';
import { balanceToDisplayValue } from '@avalabs/utils-sdk';
import { BN } from 'bn.js';
import type { TxToken, NetworkToken } from '@avalabs/vm-module-types';
import { TokenType } from '@avalabs/vm-module-types';
import { resolve } from '../../utils/resolve';
import { getNftMetadata } from './get-nft-metadata';
import { getSmallImageForNFT } from '../../utils/get-small-image-for-nft';
import { ipfsResolverWithFallback } from '../../utils/ipfs-resolver-with-fallback';

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
    await Promise.allSettled(
      erc721Transfers.map(async (erc721Transfer) => {
        const token = erc721Transfer.erc721Token;
        const imageUri = await getImageUri(token.tokenUri, token.metadata.imageUri);

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
    await Promise.allSettled(
      erc1155Transfers.map(async (erc1155Transfer) => {
        const token = erc1155Transfer.erc1155Token;
        const imageUri = await getImageUri(token.tokenUri, token.metadata.imageUri);

        result.push({
          name: erc1155Transfer.erc1155Token.metadata.name ?? '',
          symbol: erc1155Transfer.erc1155Token.metadata.symbol ?? '',
          amount: erc1155Transfer.value,
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

const getImageUri = async (tokenUri: string, imageUri?: string): Promise<string> => {
  if (imageUri) {
    if (imageUri.startsWith('ipfs://')) {
      return ipfsResolverWithFallback(imageUri);
    } else {
      return imageUri;
    }
  } else {
    const [metadata, error] = await resolve(getNftMetadata(tokenUri));
    if (error) {
      return '';
    } else {
      return metadata.image ? getSmallImageForNFT(metadata.image) : '';
    }
  }
};
