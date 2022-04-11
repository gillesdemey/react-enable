import * as React from 'react';
import { useEnabled } from './useEnabled';
import { useAllEnabled } from './useAllEnabled';

export interface EnableProps {
  readonly feature?: string | string[];
  readonly allFeatures?: string[];
  children: React.ReactNode;
}

/**
 * Feature will be enabled if any feature in the list are enabled,
 */
export function Enable({ feature = [], allFeatures = [], children }: EnableProps): JSX.Element | null {
  const isAny = useEnabled(feature);
  const isAll = useAllEnabled(allFeatures);

  if (isAny || isAll) {
    return <>{children}</>;
  }

  return null;
}
