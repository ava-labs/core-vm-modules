import type { AgentIdentity, DetailItem, DetailSection } from '@avalabs/vm-module-types';
import { addressItem, linkItem, textItem } from '@internal/utils/src/utils/detail-item';

const isNavigableMetadataUri = (metadataUri: string) =>
  metadataUri.startsWith('https://') || metadataUri.startsWith('http://') || metadataUri.startsWith('ipfs://');

const isEmbeddedDataUri = (metadataUri: string) => metadataUri.startsWith('data:');

export const buildAgentIdentityDetailSection = (agentIdentity: AgentIdentity): DetailSection => {
  const items: DetailItem[] = [
    textItem('Agent ID', agentIdentity.agentId),
    textItem('Registry', agentIdentity.agentRegistry, 'vertical'),
    textItem('Trust level', agentIdentity.trustLevel),
  ];

  if (agentIdentity.reputationScore !== null) {
    items.push(textItem('Reputation score', String(agentIdentity.reputationScore)));
  }

  if (agentIdentity.owner) {
    items.push(addressItem('Owner', agentIdentity.owner));
  }

  if (agentIdentity.metadataUri) {
    items.push(
      isNavigableMetadataUri(agentIdentity.metadataUri)
        ? linkItem('Metadata', { url: agentIdentity.metadataUri, name: agentIdentity.metadataUri })
        : isEmbeddedDataUri(agentIdentity.metadataUri)
        ? textItem('Metadata', 'Embedded data URI', 'vertical')
        : textItem('Metadata', agentIdentity.metadataUri, 'vertical'),
    );
  }

  return {
    title: 'Agent Identity',
    items,
  };
};
