import {
  type SigningData,
  type Network,
  type ApprovalController,
  type DisplayData,
  type RpcRequest,
  RpcMethod,
  type AppInfo,
} from '@avalabs/vm-module-types';
import { utils } from '@avalabs/avalanchejs';
import { rpcErrors } from '@metamask/rpc-errors';
import { Avalanche } from '@avalabs/core-wallets-sdk';
import { Network as GlacierNetwork } from '@avalabs/glacier-sdk';

import { getCoreHeaders, getGlacierApiKey } from '@internal/utils';

import { getProvider } from '../../utils/get-provider';
import { parseTxDetails } from '../../utils/parse-tx-details';
import { getProvidedUtxos } from '../../utils/get-provided-utxos';
import { getTransactionDetailSections } from '../../utils/get-transaction-detail-sections';

import { parseRequestParams } from './schemas/parse-request-params/parse-request-params';
import { getUnsignedOrPartiallySignedTx } from './util/get-unsigned-or-partially-signed-tx';
import { getAccountFromContext } from '../../utils/get-account-from-context';

export const avalancheSignTransaction = async ({
  request,
  network,
  approvalController,
  glacierApiUrl,
  appInfo,
}: {
  request: RpcRequest;
  network: Network;
  approvalController: ApprovalController;
  glacierApiUrl: string;
  appInfo: AppInfo;
}) => {
  const result = parseRequestParams(request.params);

  if (!result.success) {
    console.error('invalid params', result.error);

    return {
      error: rpcErrors.invalidParams('Params are invalid'),
    };
  }
  const { transactionHex, chainAlias, from, utxos: providedUtxoHexes } = result.data;

  const vm = Avalanche.getVmByChainAlias(chainAlias);
  const isTestnet = network.isTestnet ?? false;
  const provider = await getProvider({ isTestnet, customRpcHeaders: network.customRpcHeaders });

  const contextParserResult = getAccountFromContext(request.context);

  if (!contextParserResult.success) {
    return {
      error: rpcErrors.invalidParams(contextParserResult.error),
    };
  }

  const { xpAddress: currentAddress, evmAddress: currentEvmAddress } = contextParserResult.data;

  const providedUtxos = getProvidedUtxos({
    utxoHexes: providedUtxoHexes,
    vm,
  });

  const utxos = providedUtxos.length
    ? providedUtxos
    : await Avalanche.getUtxosByTxFromGlacier({
        transactionHex,
        chainAlias,
        network: isTestnet ? GlacierNetwork.FUJI : GlacierNetwork.MAINNET,
        url: glacierApiUrl,
        token: getGlacierApiKey(),
        headers: getCoreHeaders(appInfo),
      });

  const unsignedOrPartiallySignedTx = await getUnsignedOrPartiallySignedTx({
    txBytes: utils.hexToBuffer(transactionHex),
    vm,
    utxos,
    currentAddress,
    currentEvmAddress,
    provider,
  });

  // check if the current account's signature is needed
  const signerAddress = utils.addressesFromBytes([utils.parse(from ?? currentAddress)[2]])[0];

  if (!signerAddress) {
    return {
      error: rpcErrors.invalidRequest('Missing signer address'),
    };
  }

  const ownSignatureIndices = unsignedOrPartiallySignedTx.getSigIndicesForAddress(signerAddress);

  if (!ownSignatureIndices) {
    return {
      error: rpcErrors.invalidRequest('This account has nothing to sign'),
    };
  }

  const sigIndices = unsignedOrPartiallySignedTx.getSigIndices();
  const needsToSign = ownSignatureIndices.some(([inputIndex, sigIndex]) => sigIndices[inputIndex]?.includes(sigIndex));

  if (!needsToSign) {
    return {
      error: rpcErrors.invalidRequest('This account has nothing to sign'),
    };
  }
  const signerAccount = from ?? currentAddress;

  // get display data for the UI
  const txData = await Avalanche.parseAvalancheTx(unsignedOrPartiallySignedTx, provider, from ?? currentAddress);
  const txDetails = parseTxDetails(txData);

  if (txData.type === 'unknown' || txDetails === undefined) {
    return {
      error: rpcErrors.invalidParams('Unable to parse transaction data. Unsupported tx type'),
    };
  }

  const signingData: SigningData = {
    type: RpcMethod.AVALANCHE_SIGN_TRANSACTION,
    data: txData,
    vm,
    unsignedTxJson: JSON.stringify(unsignedOrPartiallySignedTx.toJSON()),
    ownSignatureIndices,
  };

  const details = getTransactionDetailSections(txDetails, network.networkToken.symbol, {
    network,
    signerAccount,
  });

  // Throw an error if we can't parse the transaction details
  if (details === undefined) {
    return {
      error: rpcErrors.internal('Unable to parse transaction display data. Unsupported tx type'),
    };
  }

  const displayData: DisplayData = {
    title: 'Do you approve this transaction?',
    dAppInfo: {
      name: request.dappInfo.name,
      action: `${request.dappInfo.name} requests you to sign the following transaction`,
      logoUri: request.dappInfo.icon,
    },
    network: {
      chainId: network.chainId,
      name: network.chainName,
      logoUri: network.logoUri,
    },
    details,
  };

  // prompt user for approval
  const response = await approvalController.requestApproval({ request, displayData, signingData });

  if ('error' in response) {
    return {
      error: response.error,
    };
  }

  if (!('signedData' in response)) {
    return {
      error: rpcErrors.invalidRequest('No signed data returned'),
    };
  }
  return { result: response.signedData };
};
