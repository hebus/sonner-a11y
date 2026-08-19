import { resetConfig, setConfig } from "./config.js";
import { addToast, dismissToast } from "./toast.js";
import { ExternalToast, PromiseData, PromiseT } from "./types.js";

const promise = <ToastData>(input: PromiseT<ToastData>, data?: PromiseData<ToastData>) => {
  if (!data) return;
  let id: string | number | undefined;
  if (data.loading !== undefined) {
    id = toast.loading(data.loading, {
      description: typeof data.description !== "function" ? data.description : "",
    });
  }
  const settled = typeof input === "function" ? input() : input;

  settled
    .then(async (_) => {
      const description =
        typeof data.description === "function" ? await data.description(_) : data.description;
      if (!data.success) return;
      let success = data.success;
      const success_info = typeof success === "function" ? await success(_) : success;
      toast.success(success_info as string, { id, description });
    })
    .catch(async (_) => {
      const description =
        typeof data.description === "function" ? await data.description(_) : data.description;
      if (!data.error) return;
      let error = data.error;
      const error_info = typeof error === "function" ? await error(_) : error;
      toast.error(error_info as string, { id, description });
    })
    .finally(data.finally);
};

/**
 * Assembled with `Object.assign` rather than successive `toast.x = …` assignments: the latter makes
 * TypeScript emit a `declare function` plus a `declare namespace`, and because that namespace also
 * re-exports `dismiss`/`config`/`resetConfig`, its remaining members stop being implicitly exported.
 * Consumers then get `Property 'success' does not exist on type 'typeof toast'`.
 */
const toast = Object.assign(
  (message: string, options?: Omit<ExternalToast, "richColors">) =>
    addToast({ title: message, ...options }),
  {
    message: (message: string, options?: Omit<ExternalToast, "richColors">) =>
      addToast({ title: message, ...options }),
    success: (message: string, options?: ExternalToast) =>
      addToast({ type: "success", title: message, ...options }),
    error: (message: string, options?: ExternalToast) =>
      addToast({ type: "error", title: message, ...options }),
    info: (message: string, options?: ExternalToast) =>
      addToast({ type: "info", title: message, ...options }),
    warning: (message: string, options?: ExternalToast) =>
      addToast({ type: "warning", title: message, ...options }),
    loading: (message: string, options?: ExternalToast) =>
      addToast({ type: "loading", title: message, duration: 0, ...options }),
    dismiss: dismissToast,
    promise,
    config: setConfig,
    resetConfig,
  },
);

export default toast;
