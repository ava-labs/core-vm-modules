import { AlertType, type Alert } from '@avalabs/vm-module-types';

const SEVERITY: Record<AlertType, number> = {
  [AlertType.INFO]: 0,
  [AlertType.WARNING]: 1,
  [AlertType.DANGER]: 2,
};

// Merges two alerts into one, preferring the more severe alert's type and title, and combining the descriptions.
export const mergeAlerts = (primary?: Alert, secondary?: Alert): Alert | undefined => {
  if (!primary) return secondary;
  if (!secondary) return primary;

  const [leading, trailing] =
    SEVERITY[secondary.type] > SEVERITY[primary.type] ? [secondary, primary] : [primary, secondary];

  return {
    ...leading,
    details: {
      ...leading.details,
      body: [...(leading.details.body ?? []), `${trailing.details.title}: ${trailing.details.description}`],
    },
  };
};
