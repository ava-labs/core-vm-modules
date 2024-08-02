import {
  type SigningData,
  type Network,
  type ApprovalController,
  type DisplayData,
  type RpcRequest,
  RpcMethod,
} from '@avalabs/vm-module-types';
import { parseRequestParams } from './schemas/parse-request-params/parse-request-params';
import { rpcErrors } from '@metamask/rpc-errors';
import { Avalanche } from '@avalabs/core-wallets-sdk';
import { avaxSerial, EVMUnsignedTx, UnsignedTx, utils } from '@avalabs/avalanchejs';
import { getProvider } from '../../utils/get-provider';
import { getProvidedUtxos } from './utils/get-provided-utxos';

const GLACIER_API_KEY = process.env.GLACIER_API_KEY;

export const avalancheSendTransaction = async ({
  request,
  network,
  approvalController,
  glacierApiUrl,
}: {
  request: RpcRequest;
  network: Network;
  approvalController: ApprovalController;
  glacierApiUrl: string;
}) => {
  const result = parseRequestParams(request.params);

  if (!result.success) {
    console.error('invalid params', result.error);

    return {
      error: rpcErrors.invalidParams('Params are invalid'),
    };
  }

  try {
    const { transactionHex, chainAlias, externalIndices, internalIndices, utxos: providedUtxoHexes } = result.data;

    const vm = Avalanche.getVmByChainAlias(chainAlias);
    const txBytes = utils.hexToBuffer(transactionHex);
    const isTestnet = network.isTestnet ?? false;
    const provider = getProvider({ isTestnet });
    const currentAddress = request.context?.['currentAddress'];

    if (!currentAddress || typeof currentAddress !== 'string') {
      return {
        error: rpcErrors.invalidRequest('No active account found'),
      };
    }

    const providedUtxos = getProvidedUtxos({
      utxoHexes: providedUtxoHexes,
      vm,
    });

    const utxos = providedUtxos.length
      ? providedUtxos
      : await Avalanche.getUtxosByTxFromGlacier({
          transactionHex,
          chainAlias,
          isTestnet,
          url: glacierApiUrl,
          token: GLACIER_API_KEY,
        });

    let unsignedTx: UnsignedTx | EVMUnsignedTx;
    if (chainAlias === 'C') {
      unsignedTx = await Avalanche.createAvalancheEvmUnsignedTx({
        txBytes,
        vm,
        utxos,
        fromAddress: currentAddress,
      });
    } else {
      const tx = utils.unpackWithManager(vm, txBytes) as avaxSerial.AvaxTx;
      const xpubXP = request.context?.['xpubXP'];

      if (!xpubXP || typeof xpubXP !== 'string') {
        return {
          error: rpcErrors.invalidParams('Request should have xpubXP in context'),
        };
      }

      const externalAddresses = await getAddressesByIndices({
        indices: externalIndices ?? [],
        chainAlias,
        isChange: false,
        isTestnet,
        xpubXP,
      });

      const internalAddresses = await getAddressesByIndices({
        indices: internalIndices ?? [],
        chainAlias,
        isChange: true,
        isTestnet,
        xpubXP,
      });

      const fromAddresses = [...new Set([currentAddress, ...externalAddresses, ...internalAddresses])];

      const fromAddressBytes = fromAddresses.map((address) => utils.parse(address)[2]);

      unsignedTx = await Avalanche.createAvalancheUnsignedTx({
        tx,
        utxos,
        provider,
        fromAddressBytes,
      });
    }

    const txData = await Avalanche.parseAvalancheTx(unsignedTx, provider, currentAddress);

    // Throw an error if we can't parse the transaction
    if (txData.type === 'unknown') {
      return {
        error: rpcErrors.internal('Unable to parse transaction data. Unsupported tx type'),
      };
    }

    const signingData: SigningData = {
      type: RpcMethod.AVALANCHE_SEND_TRANSACTION,
      unsignedTxJson: JSON.stringify(unsignedTx.toJSON()),
      data: txData,
      vm,
    };

    const displayData: DisplayData = {
      title: 'Sign Message',
      network: {
        chainId: network.chainId,
        name: network.chainName,
        logoUri: network.logoUri,
      },
    };

    // prompt user for approval
    const response = await approvalController.requestApproval({ request, displayData, signingData });

    if ('error' in response) {
      return {
        error: response.error,
      };
    }

    return { result: response.result };
  } catch (error) {
    console.error(error);
    return {
      error: rpcErrors.internal('Unable to create transaction'),
    };
  }
};

const getAddressesByIndices = async ({
  indices,
  chainAlias,
  isChange,
  isTestnet,
  xpubXP,
}: {
  indices: number[];
  chainAlias: 'X' | 'P';
  isChange: boolean;
  isTestnet: boolean;
  xpubXP: string;
}): Promise<string[]> => {
  if (isChange && chainAlias !== 'X') {
    return [];
  }

  const provider = getProvider({ isTestnet });

  return indices.map((index) => Avalanche.getAddressFromXpub(xpubXP, index, provider, chainAlias, isChange));
};
