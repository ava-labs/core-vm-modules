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
import { avaxSerial, utils, Credential } from '@avalabs/avalanchejs';
import { getProvider } from '../../utils/get-provider';
import { parseTxDetails } from '../avalanche-send-transaction/utils/parse-tx-details';
import { getTransactionDetailSections } from '../avalanche-send-transaction/utils/get-transaction-detail-sections';

const GLACIER_API_KEY = process.env.GLACIER_API_KEY;

export const avalancheSignTransaction = async ({
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
  const { transactionHex, chainAlias, from } = result.data;
  const vm = Avalanche.getVmByChainAlias(chainAlias);
  const txBytes = utils.hexToBuffer(transactionHex);
  const isTestnet = network.isTestnet ?? false;
  const provider = getProvider({ isTestnet });

  const tx = utils.unpackWithManager(vm, txBytes) as avaxSerial.AvaxTx;

  const utxos = await Avalanche.getUtxosByTxFromGlacier({
    transactionHex,
    chainAlias,
    isTestnet,
    url: glacierApiUrl,
    token: GLACIER_API_KEY,
  });

  let credentials: Credential[] | undefined;

  try {
    const codecManager = utils.getManagerForVM(vm);
    const signedTx = codecManager.unpack(txBytes, avaxSerial.SignedTx);
    const unsignedTx = await Avalanche.createAvalancheUnsignedTx({
      tx,
      utxos,
      provider,
      credentials: signedTx.getCredentials(),
    });

    // transaction has been already (partially) signed, but it may have gaps in its signatures arrays
    // so we fill these gaps with placeholder signatures if needed
    credentials = tx.getSigIndices().map(
      (sigIndices, credentialIndex) =>
        new Credential(
          Avalanche.populateCredential(sigIndices, {
            unsignedTx,
            credentialIndex,
          }),
        ),
    );
  } catch (err) {
    // transaction hasn't been signed yet thus we continue with a custom list of empty credentials
    // to ensure it contains a signature slot for all signature indices from the inputs
    credentials = tx.getSigIndices().map((indicies) => new Credential(Avalanche.populateCredential(indicies)));
  }

  const unsignedTx = await Avalanche.createAvalancheUnsignedTx({
    tx,
    provider,
    credentials,
    utxos,
  });

  // check if the current account's signature is needed
  const signerAddress = utils.addressesFromBytes([utils.parse(from)[2]])[0];

  if (!signerAddress) {
    return {
      error: rpcErrors.invalidRequest('Missing signer address'),
    };
  }

  const ownSignatureIndices = unsignedTx.getSigIndicesForAddress(signerAddress);

  if (!ownSignatureIndices) {
    return {
      error: rpcErrors.invalidRequest('This account has nothing to sign'),
    };
  }

  const sigIndices = unsignedTx.getSigIndices();
  const needsToSign = ownSignatureIndices.some(([inputIndex, sigIndex]) => sigIndices[inputIndex]?.includes(sigIndex));

  if (!needsToSign) {
    return {
      error: rpcErrors.invalidRequest('This account has nothing to sign'),
    };
  }

  // get display data for the UI
  const txData = await Avalanche.parseAvalancheTx(unsignedTx, provider, from);
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
    unsignedTxJson: JSON.stringify(unsignedTx.toJSON()),
    ownSignatureIndices,
  };

  const details = getTransactionDetailSections(txDetails, network.networkToken);

  const displayData: DisplayData = {
    title: 'Sign Transaction',
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
