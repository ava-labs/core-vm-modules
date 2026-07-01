export type TrustLevel = 'high' | 'medium' | 'low' | 'unknown';

export interface AgentIdentity {
  agentId: string;
  agentRegistry: string;
  owner: string | null;
  reputationScore: number | null;
  metadataUri: string | null;
  trustLevel: TrustLevel;
}

export interface AgentIdentityDeclaration {
  agentId: string;
  agentRegistry: string;
}
