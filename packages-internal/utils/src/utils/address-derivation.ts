import type { DeriveAddressParams, DetailedDeriveAddressParams } from '@avalabs/vm-module-types';

export const hasDerivationDetails = (params: DeriveAddressParams): params is DetailedDeriveAddressParams =>
  'derivationPathType' in params &&
  'accountIndex' in params &&
  typeof params.accountIndex === 'number' &&
  typeof params.derivationPathType === 'string';
