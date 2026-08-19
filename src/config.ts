import {
  A11yLabelsType,
  A11yOptionsType,
  ToastContentType,
  ToastOptionsType,
  ToastTypeName,
  ToasterType,
} from "./types";

type ResolvedA11yType = Required<Omit<A11yOptionsType, "labels">> & {
  labels: Required<Omit<A11yLabelsType, "types">> & { types: Record<ToastTypeName, string> };
};

type ResolvedConfigType = Omit<Required<ToasterType>, "toastOptions" | "a11y"> & {
  toastOptions: Required<ToastOptionsType>;
  a11y: ResolvedA11yType;
};

const defaultConfig: ResolvedConfigType = {
  theme: "light",
  expand: false,
  visibleToasts: 3,
  gap: 14,
  offset: 24,
  mobileOffset: 16,
  dir: "ltr",
  toastOptions: {
    position: "bottom-right",
    closeButton: false,
    richColors: false,
    duration: 3000,
    invert: false,
    important: "auto",
    titleAsHtml: false,
    onDismiss: () => {},
    onAutoClose: () => {},
  },
  a11y: {
    announce: true,
    announceClearDelay: 1000,
    hotkey: ["altKey", "KeyT"],
    pauseOnHover: true,
    pauseOnFocus: true,
    pauseOnDocumentHidden: true,
    dismissOnEscape: false,
    dismissKeys: ["Delete", "Backspace"],
    labels: {
      region: "Notifications",
      close: "Close notification",
      action: "Action",
      types: {
        success: "Success",
        error: "Error",
        info: "Information",
        warning: "Warning",
        loading: "Loading",
      },
    },
  },
};

export let config = { ...defaultConfig };

let configUpdateCallback: (() => void) | null = null;

export function registerConfigUpdateCallback(callback: () => void) {
  configUpdateCallback = callback;
}

/**
 * Merges into the current configuration. Spreading `defaultConfig` instead would reset every option
 * the caller did not pass, so a second partial call anywhere in the application silently undid the
 * first one — losing the theme, the position or a set of translated labels.
 */
export function setConfig(userConfig: ToasterType) {
  config = {
    ...config,
    ...userConfig,
    toastOptions: { ...config.toastOptions, ...userConfig.toastOptions },
    a11y: {
      ...config.a11y,
      ...userConfig.a11y,
      labels: {
        ...config.a11y.labels,
        ...userConfig.a11y?.labels,
        types: { ...config.a11y.labels.types, ...userConfig.a11y?.labels?.types },
      },
    },
  };
  configUpdateCallback?.();
}

/** Back to the shipped defaults, for the callers that relied on setConfig resetting everything. */
export function resetConfig() {
  config = { ...defaultConfig };
  configUpdateCallback?.();
}

/** Errors interrupt by default; anything else is announced politely. `important` overrides it. */
export function resolvePoliteness(
  type: ToastContentType["type"],
  important: boolean | "auto",
): "polite" | "assertive" {
  if (important === "auto") return type === "error" ? "assertive" : "polite";
  return important ? "assertive" : "polite";
}
