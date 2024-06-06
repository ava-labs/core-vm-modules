import { object, string, boolean, z } from 'zod';

export type Wei = bigint;

export type NetworkFees = {
  low: { maxPriorityFeePerGas: Wei; maxFeePerGas: Wei };
  medium: { maxPriorityFeePerGas: Wei; maxFeePerGas: Wei };
  high: { maxPriorityFeePerGas: Wei; maxFeePerGas: Wei };
  baseFee: Wei;
};

export interface Module {
  getManifest: () => Manifest | undefined;
  getBalances: () => Promise<string>;
  getTransactionHistory: () => Promise<string>;
  getNetworkFee: () => Promise<NetworkFees | undefined>;
  getAddress: () => Promise<string>;
}

const sourceSchema = object({
  checksum: string(),
  location: object({
    npm: object({
      filePath: string(),
      packageName: string(),
      registry: string(),
    }),
  }),
});

const manifestSchema = object({
  name: string(),
  version: string(),
  description: string(),
  sources: object({
    module: sourceSchema,
    provider: sourceSchema.optional(),
  }),
  network: object({
    chainIds: string().array(),
    namespaces: string().array(),
  }),
  cointype: string(),
  permissions: object({
    rpc: object({
      dapps: boolean(),
      methods: string(),
    }),
  }),
  manifestVersion: string(),
});

export type Manifest = z.infer<typeof manifestSchema>;

export const parseManifest = (params: unknown): z.SafeParseReturnType<unknown, Manifest> => {
  return manifestSchema.safeParse(params);
};
