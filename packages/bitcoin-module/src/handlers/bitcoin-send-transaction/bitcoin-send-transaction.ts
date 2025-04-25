import {
  RpcMethod,
  type ApprovalController,
  type DisplayData,
  type Hex,
  type Network,
  type RpcRequest,
  type SigningData,
} from '@avalabs/vm-module-types';
import { parseRequestParams } from './schema';
import { rpcErrors } from '@metamask/rpc-errors';
import { getProvider } from '../../utils/get-provider';
import { getBalances } from '../get-balances/get-balances';
import { isBtcBalance } from '../../utils/is-btc-balance';
import { createTransferTx, type BitcoinInputUTXO } from '@avalabs/core-wallets-sdk';
import { calculateGasLimit } from '../../utils/calculate-gas-limit';
import { addressItem, currencyItem } from '@internal/utils';
import { linkItem } from '@internal/utils/src/utils/detail-item';
import { getTxUpdater } from '../../utils/bitcoin-tx-updater';
import { waitForTransactionReceipt } from '../../utils/wait-for-tx-receipt';
import { getTxHash } from '../../utils/get-tx-hash';

type BitcoinSendTransactionParams = {
  request: RpcRequest;
  network: Network;
  approvalController: ApprovalController;
  proxyApiUrl: string;
};

export const bitcoinSendTransaction = async ({
  request,
  network,
  approvalController,
  proxyApiUrl,
}: BitcoinSendTransactionParams) => {
  const { dappInfo, params: rawParams } = request;

  const { success, data: params, error: parseError } = parseRequestParams(rawParams);

  if (!success) {
    console.error('invalid params', parseError);
    return {
      error: rpcErrors.invalidParams({ message: 'Transaction params are invalid', data: { cause: parseError } }),
    };
  }

  const balances = await getBalances({ addresses: [params.from], network, proxyApiUrl, withScripts: true });
  const btcBalance = balances?.[params.from]?.[network.networkToken.symbol];

  if (!isBtcBalance(btcBalance)) {
    return {
      error: rpcErrors.internal('Balance for the source account is not available'),
    };
  }

  const provider = await getProvider({
    isTestnet: Boolean(network.isTestnet),
    proxyApiUrl,
  });

  const { to, from, amount, feeRate } = params;

  const { inputs, outputs, fee } = createTransferTx(
    to,
    from,
    amount,
    feeRate,
    btcBalance.utxos as BitcoinInputUTXO[], // we asked for scripts in getBalances() call
    provider.getNetwork(),
  );

  if (!inputs || !outputs) {
    return {
      error: rpcErrors.internal('Unable to create transaction'),
    };
  }

  const displayData: DisplayData = {
    title: 'Do you approve this transaction?',
    network: {
      chainId: network.chainId,
      name: network.chainName,
      logoUri: network.logoUri,
    },
    details: [
      {
        title: 'Transaction Details',
        items: [
          linkItem('Website', dappInfo),
          addressItem('From', from),
          addressItem('To', to),
          currencyItem('Amount', BigInt(amount), network.networkToken.decimals, network.networkToken.symbol),
        ],
      },
    ],
    networkFeeSelector: true,
  };

  const signingData: SigningData = {
    type: RpcMethod.BITCOIN_SEND_TRANSACTION,
    account: from,
    data: {
      to,
      amount,
      fee,
      feeRate,
      gasLimit: calculateGasLimit(fee, feeRate),
      inputs,
      outputs,
      balance: btcBalance,
    },
  };

  const { updateTx, cleanup } = getTxUpdater(request.requestId, signingData, displayData, provider);
  const response = await approvalController.requestApproval({ request, displayData, signingData, updateTx });

  cleanup();

  if ('error' in response) {
    return {
      error: response.error,
    };
  }

  let txHash;

  try {
    txHash = await getTxHash(provider, response);
  } catch (error) {
    return {
      error: rpcErrors.internal({ message: 'Unable to get transaction hash', data: { cause: error } }),
    };
  }

  waitForTransactionReceipt({
    explorerUrl: network.explorerUrl ?? '',
    provider,
    txHash: txHash as Hex,
    onTransactionConfirmed: approvalController.onTransactionConfirmed,
    onTransactionReverted: approvalController.onTransactionReverted,
    // Pass the requestId so that client apps can pair the transaction
    // status changes back to their respective requests for better tracking.
    requestId: request.requestId,
  });

  return {
    result: txHash,
  };
};
