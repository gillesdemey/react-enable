import * as React from "react";
import { insert, remove, elem, intersection, fromArray } from "fp-ts/lib/Set";
import { eqString } from "fp-ts/lib/Eq";
export { ToggleFeatures } from "./ToggleFeatures";

interface EnableProps {
  readonly feature?: string | string[];
  readonly without?: string | string[];

  readonly allFeatures?: string[];
  readonly withoutAll?: string[];
}

type EnableContextType = (feature: String) => boolean;

/**
 * Provide a function that can be used to check whether a given feature is enabled.
 */
export const EnableContext = React.createContext<EnableContextType>(
  _s => false
);

/**
 * Given a feature name (or names), will determine if that feature (or any one) is enabled
 * Second argument allows for negation.
 */
export function useEnabledFull(props: EnableProps): boolean {
  const {
    feature = [],
    without = [],
    allFeatures = [],
    withoutAll = []
  } = props;
  const test = React.useContext(EnableContext);
  if (test == null) {
    return false;
  }

  let someFeatureList = Array.isArray(feature) ? feature : [feature];
  let maybeEnabled =
    someFeatureList.some(test) ||
    (allFeatures.length > 0 && allFeatures.every(test));
  if (!maybeEnabled && feature.length > 0) {
    return false;
  }

  let someWithoutList = Array.isArray(without) ? without : [without];
  let maybeDisabled =
    someWithoutList.some(test) ||
    (withoutAll.length > 0 && withoutAll.every(test));
  if (maybeDisabled) {
    return false;
  }

  return true;
}

/**
 * returns true iff all specified features are enabled
 */
export function useAllEnabled(allFeatures: string[]) {
  return useEnabledFull({ allFeatures });
}

/**
 * returns true iff all specified features are disabled
 */
export function useAllDisabled(withoutAll: string[]) {
  return useEnabledFull({ withoutAll });
}

/**
 * returns true iff any specified feature is enabled
 */
export function useEnabled(feature: string | string[]) {
  return useEnabledFull({ feature });
}

/**
 * returns true iff any specified feature is disabled
 */
export function useDisabled(without: string | string[]) {
  return useEnabledFull({ without });
}

/**
 * Feature will be enabled if any feature in the list are enabled, but without wins.
 * This allows you to enable things except if some other feature is active, for instance.
 */
export const Enable: React.FC<EnableProps> = ({
  feature = [],
  without = [],
  allFeatures = [],
  withoutAll = [],
  children
}) => {
  if (useEnabledFull({ feature, without, allFeatures, withoutAll })) {
    return <>{children}</>;
  }

  return null;
};

export interface Feature {
  readonly name: string;
  readonly description?: string;
}

interface EnableState {
  readonly features: Feature[];
  readonly active: Set<string>;
}

interface DisableFeature {
  type: "disable";
  readonly feature: string;
}

interface ToggleFeature {
  type: "toggle";
  readonly feature: string;
}

interface EnableFeature {
  type: "enable";
  readonly feature: string;
}

interface SetActiveFeatures {
  type: "set-active";
  readonly active: string[];
}

type EnableAction =
  | EnableFeature
  | DisableFeature
  | ToggleFeature
  | SetActiveFeatures;

const fromStrArray = fromArray(eqString);
const insertStr = insert(eqString);
const removeStr = remove(eqString);
const elemStr = elem(eqString);
const intersectStr = intersection(eqString);

const reducer: React.Reducer<EnableState, EnableAction> = (state, action) => {
  switch (action.type) {
    case "enable": {
      if (!state.features.some(x => x.name === action.feature)) {
        return state;
      }
      return {
        ...state,
        active: insertStr(action.feature)(state.active)
      };
    }

    case "disable": {
      if (!state.features.some(x => x.name === action.feature)) {
        return state;
      }
      return {
        ...state,
        active: removeStr(action.feature)(state.active)
      };
    }

    case "toggle": {
      if (!state.features.some(x => x.name === action.feature)) {
        return state;
      }
      return {
        ...state,
        active: elemStr(action.feature, state.active)
          ? removeStr(action.feature)(state.active)
          : insertStr(action.feature)(state.active)
      };
    }

    case "set-active": {
      const proposedActive = fromStrArray(action.active);
      const possible = fromStrArray(state.features.map(x => x.name));
      return {
        ...state,
        active: intersectStr(proposedActive, possible)
      };
    }

    default:
      throw new Error("Unsupported action");
  }
};

interface FeatureProps {
  readonly features: Feature[];
  readonly defaultEnabled: string[];
  readonly consoleOverride?: boolean;
}

class GlobalEnable {
  private readonly dispatch: React.Dispatch<EnableAction>;

  constructor(dispatch: React.Dispatch<EnableAction>) {
    this.dispatch = dispatch;
  }

  public toggle(feature: string) {
    this.dispatch({ type: "toggle", feature });
  }

  public enable(feature: string) {
    this.dispatch({ type: "enable", feature });
  }

  public disable(feature: string) {
    this.dispatch({ type: "disable", feature });
  }
}

declare global {
  interface Window {
    feature?: GlobalEnable;
  }
}

interface FeatureContextType {
  dispatch: React.Dispatch<EnableAction>;
  state: EnableState;
}

export const FeatureContext = React.createContext<FeatureContextType | null>(
  null
);

/**
 * A more batteries-enabled parent component that keeps track of feature state
 * internally, and creates window.feature.enable("f") and window.feature.disable("f").
 */
export const Features: React.FC<FeatureProps> = ({
  features,
  defaultEnabled,
  consoleOverride = false,
  children
}) => {
  const initial: EnableState = { features, active: new Set(defaultEnabled) };
  const [state, dispatch] = React.useReducer(reducer, initial);

  React.useEffect(() => {
    if (!consoleOverride) {
      return () => {
        /* empty */
      };
    }
    window.feature = new GlobalEnable(dispatch);
    return () => {
      window.feature = undefined;
    };
  }, [dispatch]);

  const featureValue = React.useMemo(() => ({ dispatch, state }), [
    dispatch,
    state,
    state.active
  ]);

  const testCallback = React.useCallback((f: string) => state.active.has(f), [
    state,
    state.active
  ]);

  return (
    <FeatureContext.Provider value={featureValue}>
      <EnableContext.Provider value={testCallback}>
        {children}
      </EnableContext.Provider>
    </FeatureContext.Provider>
  );
};
