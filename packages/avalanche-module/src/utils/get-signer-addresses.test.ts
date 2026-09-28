import { utils } from '@avalabs/avalanchejs';

import { getSignerAddresses } from './get-signer-addresses';

const XP_ADDRESS = 'X-fuji1utacgpu8arf7sq0vdfh0zk0pukgfk8nyfxsh2k';
const EVM_ADDRESS = '0x0102030405060708090a0b0c0d0e0f1011121314';

describe('getSignerAddresses', () => {
  it('returns bech32 address bytes for x/p', () => {
    expect(getSignerAddresses([XP_ADDRESS])).toEqual([utils.parse(XP_ADDRESS)[2]]);
  });

  it('returns evm address bytes for c', () => {
    expect(getSignerAddresses([EVM_ADDRESS])).toEqual([utils.hexToBuffer(EVM_ADDRESS)]);
  });

  it('skips invalid addresses', () => {
    expect(getSignerAddresses([undefined, 'invalid', XP_ADDRESS])).toHaveLength(1);
  });
});
