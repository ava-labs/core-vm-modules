import { utils } from '@avalabs/avalanchejs';

export const getSignerAddresses = (addresses: readonly (string | undefined)[]): Uint8Array[] =>
  addresses.flatMap((address) => {
    if (!address) {
      return [];
    }

    try {
      return [address.startsWith('0x') ? utils.hexToBuffer(address) : utils.parse(address)[2]];
    } catch {
      return [];
    }
  });
