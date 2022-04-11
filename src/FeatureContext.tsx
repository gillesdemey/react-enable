import * as React from 'react';
import { FeaturesDispatch, FeaturesState } from './FeaturesState';
import { FeatureDescription, FeatureValue } from './FeatureState';

export const FeatureContext = React.createContext<FeatureContextType | null>(null);

/// Give access to the overrides layer
export interface FeatureContextType {
  // Make changes to the overrides
  send: FeaturesDispatch;

  featuresDescription: readonly FeatureDescription[];

  // State is in layers; overrides and defaults
  overridesState: FeaturesState;
  defaultsState: FeaturesState;

  /// Test with proper fallback and respecting the user's force preference
  test: (flag: string) => FeatureValue;
}
