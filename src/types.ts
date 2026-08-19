export type Position =
  | "top-right"
  | "top-left"
  | "top-center"
  | "bottom-right"
  | "bottom-left"
  | "bottom-center";

export type ToastId = number | string;

export type ToastTypeName = "success" | "error" | "info" | "warning" | "loading";

/** Screen-reader labels. Defaults are in English, override them to translate. */
export type A11yLabelsType = {
  /** Accessible name of the notification region. `{hotkey}` is substituted with the hotkey label; without it the hotkey is appended in parentheses. */
  region?: string;
  /** Accessible name of the close button. */
  close?: string;
  /** Prefix used when announcing that a toast carries an action, e.g. `Action: Undo`. */
  action?: string;
  /** Visually hidden severity prefix, read before the title. */
  types?: Partial<Record<ToastTypeName, string>>;
};

export type A11yOptionsType = {
  /** Announce toasts through a dedicated live region. */
  announce?: boolean;
  /** Delay before the announced text is removed from the live region, in ms. */
  announceClearDelay?: number;
  /** Key combination that moves focus to the most recent toast. Modifier properties (`altKey`…) and/or `KeyboardEvent.code` values. */
  hotkey?: string[];
  pauseOnHover?: boolean;
  pauseOnFocus?: boolean;
  pauseOnDocumentHidden?: boolean;
  /** Make Escape dismiss the focused toast instead of leaving the region. */
  dismissOnEscape?: boolean;
  /** Keys that dismiss the focused toast. Empty array disables it. */
  dismissKeys?: string[];
  labels?: A11yLabelsType;
};

export type ToasterType = {
  theme?: "dark" | "light";
  expand?: boolean;
  visibleToasts?: number;
  offset?: number;
  mobileOffset?: number;
  gap?: number;
  dir?: "rtl" | "ltr";
  toastOptions?: ToastOptionsType;
  a11y?: A11yOptionsType;
};

export type ToastOptionsType = {
  position?: Position;
  closeButton?: boolean;
  richColors?: boolean;
  duration?: number;
  invert?: boolean;
  /** Announce assertively, interrupting the screen reader. `'auto'` means assertive for errors only. */
  important?: boolean | "auto";
  /** Interpret `title` as HTML. Defaults to false: the title is inserted as plain text. */
  titleAsHtml?: boolean;
  onDismiss?: (toast?: ToastType) => void;
  onAutoClose?: (toast?: ToastType) => void;
};

export type ToastContentType = {
  id?: ToastId;
  title: string;
  description?: string;
  type?: ToastTypeName;
  /** Overrides the visually hidden severity label for this toast. */
  typeLabel?: string;
  action?: {
    label: string;
    onClick: (event: MouseEvent) => void;
    cancel?: boolean;
  };
};

export type ToastType = ToastContentType & ToastOptionsType;

export type PromiseT<Data = any> = Promise<Data> | (() => Promise<Data>);

export type ExternalToast = Omit<ToastType, "type" | "title">;

export interface PromiseIExtendedResult extends ExternalToast {
  message: string;
}

export type PromiseTExtendedResult<Data = any> =
  | PromiseIExtendedResult
  | ((data: Data) => PromiseIExtendedResult | Promise<PromiseIExtendedResult>);

export type PromiseTResult<Data = any> = string | ((data: Data) => string | Promise<string>);

export type PromiseExternalToast = Omit<ExternalToast, "description">;

export type PromiseData<ToastData = any> = PromiseExternalToast & {
  loading?: string;
  success?: PromiseTResult<ToastData> | PromiseTExtendedResult<ToastData>;
  error?: PromiseTResult | PromiseTExtendedResult;
  description?: PromiseTResult;
  finally?: () => void | Promise<void>;
};
