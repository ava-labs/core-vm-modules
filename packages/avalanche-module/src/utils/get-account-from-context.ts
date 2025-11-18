import { z } from 'zod';

import type { RpcRequest } from '@avalabs/vm-module-types';

export type CurrentAvalancheAccount = {
  xpAddress: string;
  evmAddress?: string;
  xpubXP?: string;
  externalXPAddresses: {
    index: number;
    address: string;
  }[];
};

const LegacyAvalancheTxContextSchema = z.object({
  currentAddress: z.string({ required_error: 'No active account found' }),
  currentEvmAddress: z.string().optional(),
  xpubXP: z.string({ invalid_type_error: 'xpubXP must be a string' }).optional(),
});

const NewAvalancheTxContextSchema = z.object({
  account: z.object({
    xpAddress: z.string({
      required_error: 'XP address is required',
      invalid_type_error: 'XP address must be a string',
    }),
    evmAddress: z.string().optional(),
    xpubXP: z.string({ invalid_type_error: 'xpubXP must be a string' }).optional(),
    externalXPAddresses: z.array(
      z.object({
        index: z.number(),
        address: z.string(),
      }),
    ),
  }),
});

type NewAvalancheTxContextType = z.infer<typeof NewAvalancheTxContextSchema>;
type LegacyAvalancheTxContextType = z.infer<typeof LegacyAvalancheTxContextSchema>;

const getAccountFromLegacyContext = (context: LegacyAvalancheTxContextType): CurrentAvalancheAccount => {
  return {
    xpAddress: context.currentAddress,
    evmAddress: context.currentEvmAddress,
    xpubXP: context.xpubXP,
    externalXPAddresses: [],
  };
};

const getAccountFromNewContext = (context: NewAvalancheTxContextType): CurrentAvalancheAccount => {
  return context.account;
};

type GetAccountFromContextResult =
  | {
      success: true;
      data: CurrentAvalancheAccount;
    }
  | {
      success: false;
      error: string;
    };

type RpcContextWithAccount = RpcRequest['context'] & {
  account: Record<string, unknown>;
};

const hasAccountField = (context: RpcRequest['context']): context is RpcContextWithAccount => {
  return (
    context != null &&
    typeof context === 'object' &&
    'account' in context &&
    context.account != null &&
    typeof context.account === 'object'
  );
};

export const getAccountFromContext = (context: RpcRequest['context']): GetAccountFromContextResult => {
  if (!context) {
    return {
      success: false,
      error: 'Missing Avalanche transaction context',
    };
  }

  // If `account` field is present, we treat & validate the context as a new Avalanche transaction context.
  if (hasAccountField(context)) {
    const { success, data, error } = NewAvalancheTxContextSchema.safeParse(context);

    if (!success) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Invalid or missing Avalanche transaction context',
      };
    }

    return {
      success: true,
      data: getAccountFromNewContext(data),
    };
  }

  const { success, data, error } = LegacyAvalancheTxContextSchema.safeParse(context);

  if (!success) {
    return {
      success: false,
      error: error.errors[0]?.message || 'Invalid or missing Avalanche transaction context',
    };
  }

  return {
    success: true,
    data: getAccountFromLegacyContext(data),
  };
};
