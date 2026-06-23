import type { Network, RpcRequest } from '@avalabs/vm-module-types';
import { rpcErrors } from '@metamask/rpc-errors';
import { z } from 'zod';

import { resolveAgentIdentity } from '../../utils/resolve-agent-identity';

const schema = z.object({
  agentId: z.coerce.string().regex(/^\d+$/),
  agentRegistry: z.string().min(1),
});

/**
 * Prefetch-only helper for agent identity resolution.
 * This does not persist per-dApp state; callers must still pass context.agentIdentity
 * on signing / transaction requests when they want identity shown in approvals.
 */
export const avalancheDeclareAgentIdentity = async ({
  request,
  network,
}: {
  request: RpcRequest;
  network: Network;
}) => {
  const parsed = schema.safeParse(request.params);

  if (!parsed.success) {
    console.error('invalid params', parsed.error);
    return {
      error: rpcErrors.invalidParams({
        message: 'Agent identity params are invalid',
        data: { cause: parsed.error.flatten() },
      }),
    };
  }

  return {
    result: await resolveAgentIdentity({
      declaration: parsed.data,
      rpcUrl: network.rpcUrl,
      chainId: network.chainId,
      chainName: network.chainName,
      customRpcHeaders: network.customRpcHeaders,
    }),
  };
};
