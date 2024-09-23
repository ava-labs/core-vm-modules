import { AppName } from '@avalabs/vm-module-types';

export const getDefaultHeaders = ({
  appName,
  appVersion,
}: {
  appName: AppName;
  appVersion: string;
}): Record<string, string> | undefined => {
  switch (appName) {
    case AppName.CORE_MOBILE_IOS:
    case AppName.CORE_MOBILE_ANDROID:
    case AppName.CORE_WEB:
    case AppName.CORE_EXTENSION:
    case AppName.EXPLORER:
      return {
        'x-application-name': appName,
        'x-application-version': appVersion,
      };
    case AppName.OTHER:
      return undefined;
  }
};
