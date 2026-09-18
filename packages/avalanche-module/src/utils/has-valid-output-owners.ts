import { Address, avaxSerial, avmSerial, pvmSerial, UnsignedTx, utils } from '@avalabs/avalanchejs';

export const hasValidOutputOwners = (unsignedTx: UnsignedTx, fromAddresses?: Address[]) => {
  if (!avmSerial.isAvmBaseTx(unsignedTx.getTx()) && !pvmSerial.isPvmBaseTx(unsignedTx.getTx())) {
    const outputOwnersAddresses = fromAddresses ?? [
      ...new Set(
        ((unsignedTx.getTx() as avaxSerial.AvaxTx).baseTx?.outputs ?? [])
          .map((out) => {
            const output = out.output;

            if (utils.isTransferOut(output)) {
              return output.outputOwners.addrs;
            }

            if (utils.isStakeableLockOut(output)) {
              return output.getOutputOwners().addrs;
            }

            return [];
          })
          .flat(),
      ),
    ];

    for (const outputOwnerAddress of outputOwnersAddresses) {
      if (!unsignedTx.addressMaps.has(outputOwnerAddress)) {
        return false;
      }
    }
  }

  return true;
};
