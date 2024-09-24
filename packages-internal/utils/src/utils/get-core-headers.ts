import { AppName, type AppInfo } from '@avalabs/vm-module-types';

export const getCoreHeaders = ({ name, version }: AppInfo): Record<string, string> | undefined => {
  switch (name) {
    case AppName.CORE_MOBILE_IOS:
    case AppName.CORE_MOBILE_ANDROID:
    case AppName.CORE_WEB:
    case AppName.CORE_EXTENSION:
    case AppName.EXPLORER:
      return {
        'x-application-name': name,
        'x-application-version': version,
      };
    case AppName.OTHER:
      return undefined;
  }
};
