import type { AgentIdentityDeclaration, RpcRequest } from '@avalabs/vm-module-types';

const isAgentIdentityDeclaration = (value: unknown): value is AgentIdentityDeclaration => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.agentId === 'string' && typeof candidate.agentRegistry === 'string';
};

export const getAgentIdentityFromContext = (request: RpcRequest): AgentIdentityDeclaration | null => {
  const candidate = request.context?.agentIdentity;
  return isAgentIdentityDeclaration(candidate) ? candidate : null;
};
