import { Environment } from '@avalabs/vm-module-types';

type Env = {
  proxyApiUrl: string;
  /** Proxy-first Hyperliquid `/info` endpoint. */
  infoUrl: string;
  /**
   * Fallback for activity endpoints if the proxy does not support fills/ledger.
   * Prefer `infoUrl` when possible.
   */
  activityInfoUrl: string;
};

const INFO_PATH = '/proxy/nownodes/hype/info';
const PUBLIC_ACTIVITY_INFO_URL = 'https://api.hyperliquid.xyz/info';

export const prodEnv: Env = {
  proxyApiUrl: 'https://proxy-api.avax.network',
  infoUrl: `https://proxy-api.avax.network${INFO_PATH}`,
  activityInfoUrl: PUBLIC_ACTIVITY_INFO_URL,
};

export const devEnv: Env = {
  proxyApiUrl: 'https://proxy-api-dev.avax.network',
  infoUrl: `https://proxy-api-dev.avax.network${INFO_PATH}`,
  activityInfoUrl: PUBLIC_ACTIVITY_INFO_URL,
};

export const getEnv = (environment: Environment): Env => {
  switch (environment) {
    case Environment.PRODUCTION:
      return prodEnv;
    case Environment.DEV:
      return devEnv;
  }
};
