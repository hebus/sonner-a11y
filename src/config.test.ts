import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  config,
  registerConfigUpdateCallback,
  resetConfig,
  resolvePoliteness,
  setConfig,
} from "./config";

describe("setConfig", () => {
  beforeEach(() => {
    registerConfigUpdateCallback(() => {});
    resetConfig();
  });

  it("merges into the current configuration instead of resetting it", () => {
    setConfig({ theme: "dark" });
    setConfig({ expand: true });

    // the regression this guards: spreading defaultConfig would have dropped the theme here
    expect(config.theme).toBe("dark");
    expect(config.expand).toBe(true);
  });

  it("keeps the untouched toastOptions when a single one is overridden", () => {
    setConfig({ toastOptions: { position: "top-left" } });

    expect(config.toastOptions.position).toBe("top-left");
    expect(config.toastOptions.duration).toBe(3000);
    expect(config.toastOptions.important).toBe("auto");
  });

  it("merges a11y labels down to the per-type level", () => {
    setConfig({ a11y: { labels: { types: { error: "Erreur" } } } });

    expect(config.a11y.labels.types.error).toBe("Erreur");
    expect(config.a11y.labels.types.success).toBe("Success");
    expect(config.a11y.labels.close).toBe("Close notification");
    expect(config.a11y.announce).toBe(true);
  });

  it("notifies the registered callback", () => {
    const onUpdate = vi.fn<() => void>();
    registerConfigUpdateCallback(onUpdate);

    setConfig({ gap: 20 });

    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});

describe("resetConfig", () => {
  it("restores the shipped defaults and notifies", () => {
    const onUpdate = vi.fn<() => void>();
    setConfig({ theme: "dark", visibleToasts: 9, a11y: { labels: { close: "Fermer" } } });
    registerConfigUpdateCallback(onUpdate);

    resetConfig();

    expect(config.theme).toBe("light");
    expect(config.visibleToasts).toBe(3);
    expect(config.a11y.labels.close).toBe("Close notification");
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});

describe("resolvePoliteness", () => {
  it("interrupts only for errors when important is 'auto'", () => {
    expect(resolvePoliteness("error", "auto")).toBe("assertive");
    expect(resolvePoliteness("success", "auto")).toBe("polite");
    expect(resolvePoliteness("warning", "auto")).toBe("polite");
    expect(resolvePoliteness(undefined, "auto")).toBe("polite");
  });

  it("lets an explicit important override the type", () => {
    // an error the caller does not want to interrupt with, and an info they do
    expect(resolvePoliteness("error", false)).toBe("polite");
    expect(resolvePoliteness("info", true)).toBe("assertive");
  });
});
