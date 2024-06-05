import type { Network } from '@avalabs/chains-sdk';
import type { TransactionDetails } from '@avalabs/glacier-sdk';
import { balanceToDisplayValue } from '@avalabs/utils-sdk';
import { BN } from 'bn.js';
import type { TxToken } from '@internal/types';
import { TokenType } from '@internal/types';

import { resolve } from '../utils/resolve';
import { getNftMetadata } from './getNftMetadata';
import { getSmallImageForNFT } from '../utils/getSmallImageForNFT';

export const getTokens = async (
  { nativeTransaction, erc20Transfers, erc721Transfers }: TransactionDetails,
  network: Network,
): Promise<TxToken[]> => {
  const result: TxToken[] = [];

  if (nativeTransaction.value !== '0') {
    const decimal = network.networkToken.decimals;
    const amountBN = new BN(nativeTransaction.value);
    const amountDisplayValue = balanceToDisplayValue(amountBN, decimal);
    result.push({
      decimal: decimal.toString(),
      name: network.networkToken.name,
      symbol: network.networkToken.symbol,
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

  return result;
};
