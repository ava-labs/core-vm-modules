import { address as solAddress, type GetTransactionApi } from '@solana/kit';
import type { Network } from '@avalabs/vm-module-types';

import { isFulfilled } from '@internal/utils/src/utils/is-promise-fulfilled';

import { getProvider } from '@src/utils/get-provider';
import { hasPropertyDefined } from '@src/utils/has-property-defined';
import { MoralisService } from '@src/utils/moralis-service';
import { getNetworkName } from '@src/utils/get-network-name';

type ParsedTx = ReturnType<GetTransactionApi['getTransaction']>;
type WrappedTransaction = { txHash: string; tx: NonNullable<ParsedTx> };

export const getWrappedTransactions = async ({
  network,
  address,
  proxyApiUrl,
}: {
  network: Network;
  address: string;
  proxyApiUrl: string;
}): Promise<WrappedTransaction[]> => {
  const provider = getProvider({ isTestnet: Boolean(network.isTestnet), proxyApiUrl });

  // Get main wallet signatures
  const mainSignaturesResponse = await provider.getSignaturesForAddress(solAddress(address), { limit: 25 }).send();
  const mainSignatures = mainSignaturesResponse.map((sig) => sig.signature);

  // Get Associated Token Account addresses from portfolio (simpler, no additional RPC calls)
  let allSignatures = mainSignatures;
  try {
    const moralisService = new MoralisService({ proxyApiUrl });
    const networkName = getNetworkName(network);
    const portfolioResult = await moralisService.getPortfolio({ address, network: networkName });

    if ('portfolio' in portfolioResult) {
      // Extract ATA addresses from portfolio tokens and NFTs
      const tokenATAs = portfolioResult.portfolio.tokens.map((token) => token.associatedTokenAddress);
      const nftATAs = portfolioResult.portfolio.nfts.map((nft) => nft.associatedTokenAddress);
      const ataAddresses = [...tokenATAs, ...nftATAs];

      // Get signatures for all ATA addresses
      const ataSignaturePromises = ataAddresses.map(async (ataAddress) => {
        try {
          const signaturesResponse = await provider
            .getSignaturesForAddress(solAddress(ataAddress), { limit: 25 })
            .send();
          return signaturesResponse.map((sig) => sig.signature);
        } catch (error) {
          console.error('Failed to get signatures for ATA:', ataAddress, error);
          return [];
        }
      });

      const ataSignatureResults = await Promise.allSettled(ataSignaturePromises);
      const ataSignatures = ataSignatureResults
        .filter(isFulfilled)
        .map((result) => result.value)
        .flat();

      // Combine and deduplicate all signatures
      allSignatures = Array.from(new Set([...mainSignatures, ...ataSignatures]));
    }
  } catch (error) {
    console.error('ATA discovery failed with error:', error);
  }

  // Fetch transaction data for all signatures
  const txsRequests = await Promise.allSettled(
    allSignatures.map(async (sig) => ({
      txHash: sig.toString(),
      tx: await provider.getTransaction(sig, { encoding: 'json', maxSupportedTransactionVersion: 0 }).send(),
    })),
  );

  return txsRequests
    .filter(isFulfilled)
    .map((tx) => tx.value)
    .filter(hasPropertyDefined('tx'));
};
