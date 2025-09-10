import {
  avaxSerial,
  evmSerial,
  utils,
  type EVMUnsignedTx,
  type UnsignedTx,
  type Utxo,
  type VM,
  Credential,
} from '@avalabs/avalanchejs';
import { Avalanche } from '@avalabs/core-wallets-sdk';
import { rpcErrors } from '@metamask/rpc-errors';

export const getUnsignedOrPartiallySignedTx = async ({
  vm,
  txBytes,
  utxos,
  currentAddress,
  currentEvmAddress,
  provider,
}: {
  txBytes: Uint8Array<ArrayBufferLike>;
  vm: VM;
  utxos: Utxo[];
  currentAddress: string;
  currentEvmAddress?: string;
  provider: Avalanche.JsonRpcProvider;
}) => {
  let credentials: Credential[] | undefined = undefined;
  let parsedTxInstance: UnsignedTx | EVMUnsignedTx;
  const tx = utils.unpackWithManager(vm, txBytes) as avaxSerial.AvaxTx;

  if (evmSerial.isExportTx(tx)) {
    const spenderAddress = tx.ins[0]?.address.toHex();

    if (!currentEvmAddress) {
      throw rpcErrors.invalidRequest('Missing EVM address');
    }

    if (spenderAddress?.toLowerCase() !== currentEvmAddress.toLowerCase()) {
      throw new Error('This account has nothing to sign');
    }

    return Avalanche.createAvalancheEvmUnsignedTx({
      txBytes,
      vm,
      utxos,
      fromAddress: currentAddress,
    });
  }

  try {
    const codecManager = utils.getManagerForVM(vm);
    const signedTx = codecManager.unpack(txBytes, avaxSerial.SignedTx);

    if (evmSerial.isImportTx(tx)) {
      parsedTxInstance = await Avalanche.createAvalancheEvmUnsignedTx({
        txBytes,
        vm,
        utxos,
        fromAddress: currentAddress,
      });
    } else {
      parsedTxInstance = await Avalanche.createAvalancheUnsignedTx({
        tx,
        provider,
        credentials: signedTx.getCredentials(),
        utxos,
      });
    }

    // transaction has been already (partially) signed, but it may have gaps in its signatures arrays
    // so we fill these gaps with placeholder signatures if needed
    credentials = tx.getSigIndices().map(
      (sigIndices, credentialIndex) =>
        new Credential(
          Avalanche.populateCredential(sigIndices, {
            unsignedTx: parsedTxInstance,
            credentialIndex,
          }),
        ),
    );
  } catch (_err) {
    // transaction hasn't been signed yet thus we continue with a custom list of empty credentials
    // to ensure it contains a signature slot for all signature indices from the inputs
    credentials = tx.getSigIndices().map((indicies) => new Credential(Avalanche.populateCredential(indicies)));
  }

  return Avalanche.createAvalancheUnsignedTx({
    tx,
    provider,
    credentials,
    utxos,
  });
};
