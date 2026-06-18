import { DetailItemType } from '@avalabs/vm-module-types';

import { buildAgentIdentityDetailSection } from './build-agent-identity-detail-section';

describe('buildAgentIdentityDetailSection', () => {
  const baseAgentIdentity = {
    agentId: '1599',
    agentRegistry: 'eip155:43114:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    owner: '0x1234567890123456789012345678901234567890',
    reputationScore: 88,
    trustLevel: 'high' as const,
  };

  it('renders navigable metadata URIs as links', () => {
    const section = buildAgentIdentityDetailSection({
      ...baseAgentIdentity,
      metadataUri: 'ipfs://agent.json',
    });

    expect(section.items).toContainEqual({
      label: 'Metadata',
      type: DetailItemType.LINK,
      value: {
        name: 'ipfs://agent.json',
        url: 'ipfs://agent.json',
      },
    });
  });

  it('renders data URIs as non-clickable text', () => {
    const section = buildAgentIdentityDetailSection({
      ...baseAgentIdentity,
      metadataUri: 'data:application/json;base64,eyJuYW1lIjoiYWdlbnQifQ==',
    });

    expect(section.items).toContainEqual({
      label: 'Metadata',
      type: DetailItemType.TEXT,
      value: 'Embedded data URI',
      alignment: 'vertical',
    });
  });
});
