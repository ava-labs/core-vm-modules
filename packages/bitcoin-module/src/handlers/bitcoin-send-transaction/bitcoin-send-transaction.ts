import {
  RpcMethod,
  type ApprovalController,
  type DisplayData,
  type Hex,
  type Network,
  type RpcRequest,
  type SigningData,
  type SigningResult,
} from '@avalabs/vm-module-types';
import { parseRequestParams } from './schema';
import { rpcErrors } from '@metamask/rpc-errors';
import { getProvider } from '../../utils/get-provider';
import { getBalances } from '../get-balances';
import { isBtcBalance } from '../../utils/is-btc-balance';
import { BitcoinProvider, createTransferTx, type BitcoinInputUTXO } from '@avalabs/core-wallets-sdk';

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

  const provider = getProvider({
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
    title: 'Approve Transaction',
    network: {
      chainId: network.chainId,
      name: network.chainName,
      logoUri: network.logoUri,
    },
    transactionDetails: {
      website: new URL(dappInfo.url).hostname,
      from,
      to,
    },
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
      inputs,
      outputs,
      balance: btcBalance,
    },
  };

  const response = await approvalController.requestApproval({ request, displayData, signingData });

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
    provider,
    txHash: txHash as Hex,
    onTransactionConfirmed: approvalController.onTransactionConfirmed,
    onTransactionReverted: approvalController.onTransactionReverted,
  });

  return {
    result: txHash,
  };
};

const getTxHash = async (provider: BitcoinProvider, response: SigningResult) => {
  if ('txHash' in response) {
    return response.txHash;
  }

  return provider.issueRawTx(response.signedData);
};

const waitForTransactionReceipt = async ({
  provider,
  txHash,
  onTransactionConfirmed,
  onTransactionReverted,
}: {
  provider: BitcoinProvider;
  txHash: Hex;
  onTransactionConfirmed: (txHash: Hex) => void;
  onTransactionReverted: (txHash: Hex) => void;
}) => {
  try {
    await provider.waitForTx(txHash);
    onTransactionConfirmed(txHash);
  } catch (err) {
    console.error(err);
    onTransactionReverted(txHash);
  }
};
