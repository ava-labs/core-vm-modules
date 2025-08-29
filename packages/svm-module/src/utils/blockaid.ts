import Blockaid from '@blockaid/client';

let _instance: Blockaid | null = null;

export function setBlockaid(instance: Blockaid) {
  _instance = instance;
}

export function getBlockaid(proxyApiUrl: string): Blockaid {
  if (!_instance) {
    _instance = new Blockaid({
      baseURL: proxyApiUrl + '/proxy/blockaid/',
      apiKey: DUMMY_API_KEY,
    });
  }

  return _instance;
}

const DUMMY_API_KEY = 'DUMMY_API_KEY'; // since we're using our own proxy and api key is handled there, we can use a dummy key here
