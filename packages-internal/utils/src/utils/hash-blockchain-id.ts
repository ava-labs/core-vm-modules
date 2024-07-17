import Crypto from 'crypto';

//github.com/gergelylovas/chain-agnostic-namespaces/pull/1/files#diff-cf7185539a48e85d069d194c1c17d7cfa0317b3caa3a89c92e797e3717e49d59R40
export function hashBlockchainId({ blockchainId, isTestnet }: { blockchainId: string; isTestnet?: boolean }): string {
  const blockChainIdWithPrefix = isTestnet ? 'fuji' + blockchainId : blockchainId;
  const base64 = Crypto.createHash('sha256').update(blockChainIdWithPrefix).digest('base64');
  const hash = convertBase64ToBase64Url(base64).substring(0, 32);
  return 'avax:' + hash;
}

const convertBase64ToBase64Url = (base64: string) => base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
