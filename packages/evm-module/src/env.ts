import { Environment } from '@avalabs/vm-module-types';

type Env = {
  glacierApiUrl: string;
  proxyApiUrl: string;
};

export const prodEnv: Env = {
  glacierApiUrl: 'https://core-proxy-api.avax.network/v1/proxy/glacier',
  proxyApiUrl: 'https://proxy-api.avax.network',
};

export const devEnv: Env = {
  glacierApiUrl: 'https://core-proxy-api.avax-test.network/v1/proxy/glacier',
  proxyApiUrl: 'https://proxy-api-dev.avax.network',
};

export const getEnv = (environment: Environment): Env => {
  switch (environment) {
    case Environment.PRODUCTION:
      return prodEnv;
    case Environment.DEV:
      return devEnv;
  }
};
