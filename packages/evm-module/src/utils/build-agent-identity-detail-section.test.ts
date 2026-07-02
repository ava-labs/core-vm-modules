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

  const expectMetadataLink = (metadataUri: string) => {
    const section = buildAgentIdentityDetailSection({
      ...baseAgentIdentity,
      metadataUri,
    });

    expect(section.items).toContainEqual({
      label: 'Metadata',
      type: DetailItemType.LINK,
      value: {
        name: metadataUri,
        url: metadataUri,
      },
    });
  };

  it('renders ipfs metadata URIs as links', () => {
    expectMetadataLink('ipfs://agent.json');
  });

  it('renders http metadata URIs as links', () => {
    expectMetadataLink('http://example.com/agent.json');
  });

  it('renders https metadata URIs as links', () => {
    expectMetadataLink('https://example.com/agent.json');
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

  it('renders unsupported metadata URI schemes as raw non-clickable text', () => {
    const section = buildAgentIdentityDetailSection({
      ...baseAgentIdentity,
      metadataUri: 'ftp://agent.json',
    });

    expect(section.items).toContainEqual({
      label: 'Metadata',
      type: DetailItemType.TEXT,
      value: 'ftp://agent.json',
      alignment: 'vertical',
    });
  });
});
