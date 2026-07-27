import { Environment } from '@avalabs/vm-module-types';

type Env = {
  proxyApiUrl: string;
};

export const prodEnv: Env = {
  proxyApiUrl: 'https://proxy-api.avax.network',
};

export const devEnv: Env = {
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
