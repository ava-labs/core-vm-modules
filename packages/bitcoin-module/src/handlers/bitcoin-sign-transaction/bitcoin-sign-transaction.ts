import {
  RpcMethod,
  type ApprovalController,
  type DisplayData,
  type Hex,
  type Network,
  type RpcRequest,
  type SigningData,
} from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import type { BitcoinProvider, BitcoinInputUTXO, BitcoinOutputUTXO } from '@avalabs/core-wallets-sdk';

import { addressItem, currencyItem, rpcErrorOpts } from '@internal/utils';
import { fundsRecipientItem, linkItem } from '@internal/utils/src/utils/detail-item';

import { getProvider } from '../../utils/get-provider';
import { waitForTransactionReceipt } from '../../utils/wait-for-tx-receipt';
import { getTxHash } from '../../utils/get-tx-hash';
import { parseRequestParams, type BitcoinSignTransactionParams } from './schema';

type BitcoinSignTransactionRequestParams = {
  request: RpcRequest;
  network: Network;
  approvalController: ApprovalController;
  proxyApiUrl: string;
};

export const bitcoinSignTransaction = async ({
  request,
  network,
  approvalController,
  proxyApiUrl,
}: BitcoinSignTransactionRequestParams) => {
  const { dappInfo, params: rawParams } = request;
  const { success, data: params, error: parseError } = parseRequestParams(rawParams);

  if (!success) {
    console.error('invalid params', parseError);
    return {
      error: rpcErrors.invalidParams(rpcErrorOpts('Transaction params are invalid', parseError)),
    };
  }

  const provider = await getProvider({
    isTestnet: Boolean(network.isTestnet),
    proxyApiUrl,
  });

  const { details, error: detailsError } = await parseTxDetails(params, provider);
  if (detailsError) {
    return {
      error: rpcErrors.internal(rpcErrorOpts('Transaction invalid or cannot be parsed', detailsError)),
    };
  }

  const { fee, fromAddress, outputs, transferTotal } = details;
  const { decimals, symbol } = network.networkToken;

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
          addressItem('From', fromAddress),
          currencyItem('Total Transferred Amount', BigInt(transferTotal), decimals, symbol),
        ],
      },
      {
        title: 'Recipients',
        items: outputs.map(({ address, value }) => fundsRecipientItem(address, BigInt(value), decimals, symbol)),
      },
      { title: 'Network Fee', items: [currencyItem('Total Fee', BigInt(fee), decimals, symbol)] },
    ],
    networkFeeSelector: false,
  };

  const signingData: SigningData = {
    type: RpcMethod.BITCOIN_SIGN_TRANSACTION,
    account: fromAddress,
    data: {
      inputs: params.inputs,
      outputs: params.outputs,
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
      error: rpcErrors.internal(rpcErrorOpts('Unable to get transaction hash', error)),
    };
  }

  waitForTransactionReceipt({
    explorerUrl: network.explorerUrl ?? '',
    provider,
    txHash: txHash as Hex,
    onTransactionPending: approvalController.onTransactionPending,
    onTransactionConfirmed: approvalController.onTransactionConfirmed,
    onTransactionReverted: approvalController.onTransactionReverted,
    // Pass the requestId so that client apps can pair the transaction
    // status changes back to their respective requests for better tracking.
    request: request,
  });

  return {
    result: txHash,
  };
};

const getScript = (inputs: BitcoinInputUTXO[]): string => {
  const scripts = Array.from(new Set(inputs.map(({ script }) => script)));

  if (scripts.length !== 1) {
    throw rpcErrors.invalidParams({
      message: `All input UTXOs must belong to a single address, found ${scripts.length}`,
    });
  }

  return scripts[0]!;
};

/**
 * Checks the caller's claimed input values against the UTXOs the chain actually holds.
 *
 * Only the outputs of this transaction are shown as amounts; everything the inputs are worth
 * beyond them is paid to the miner. The fee on the approval screen is `inputs - outputs`, so
 * a caller that understates its input values makes an arbitrarily large fee look negligible
 * while the real UTXOs are still what gets spent.
 */
const assertInputValuesAreReal = async (
  inputs: BitcoinInputUTXO[],
  fromAddress: string,
  provider: BitcoinProvider,
): Promise<void> => {
  const { utxos, utxosUnconfirmed } = await provider.getUtxoBalance(fromAddress, false);
  const knownValues = new Map(
    [...utxos, ...utxosUnconfirmed].map((utxo) => [`${utxo.txHash}:${utxo.index}`, utxo.value]),
  );

  for (const input of inputs) {
    const knownValue = knownValues.get(`${input.txHash}:${input.index}`);

    if (knownValue === undefined) {
      throw new Error(`Input ${input.txHash}:${input.index} does not belong to ${fromAddress}`);
    }

    if (knownValue !== input.value) {
      throw new Error(
        `Input ${input.txHash}:${input.index} claims a value of ${input.value} but is worth ${knownValue}`,
      );
    }
  }
};

const parseTxDetails = async (
  params: BitcoinSignTransactionParams,
  provider: BitcoinProvider,
): Promise<
  | {
      details: {
        fromAddress: string;
        outputs: [BitcoinOutputUTXO, ...BitcoinOutputUTXO[]];
        fee: number;
        transferTotal: number;
      };
      error: null;
    }
  | { details: null; error: Error }
> => {
  try {
    const script = getScript(params.inputs);
    const fromAddress = await provider.getAddressFromScript(script);

    await assertInputValuesAreReal(params.inputs, fromAddress, provider);

    const outputs = params.outputs.filter(({ address }) => address !== fromAddress);
    const inputsTotal = params.inputs.reduce((sum, { value }) => sum + value, 0);
    const outputsTotal = params.outputs.reduce((sum, { value }) => sum + value, 0); // with the change address
    const transferTotal = outputs.reduce((sum, { value }) => sum + value, 0); // without the change address
    const fee = inputsTotal - outputsTotal;

    assertNonEmpty(outputs);

    return {
      error: null,
      details: {
        fromAddress,
        outputs,
        fee,
        transferTotal,
      },
    };
  } catch (error) {
    console.error(error);
    return {
      details: null,
      error: error instanceof Error ? error : new Error(error?.toString() ?? 'Unknown error'),
    };
  }
};

function assertNonEmpty<T>(array: T[]): asserts array is [T, ...T[]] {
  if (array.length < 1) {
    throw new Error('No actual output is provided, this transaction would only burn funds');
  }
}
