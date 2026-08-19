import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { commands } from "vitest/browser";

import toast from "./index.js";

declare module "vitest/browser" {
  interface BrowserCommands {
    emulateMedia: (options: Record<string, string | null>) => Promise<void>;
  }
}

async function reset() {
  toast.dismiss();
  toast.resetConfig();
  const shadowRoot = document.querySelector("[data-sonner-toasters]")?.shadowRoot;
  if (!shadowRoot) return;
  await vi.waitUntil(() => shadowRoot.querySelectorAll("li").length === 0);
}

const shadow = () => document.querySelector("[data-sonner-toasters]")!.shadowRoot!;

async function loadingToast() {
  toast.loading("Saving…");
  await vi.waitFor(() => expect(shadow().querySelector(".sonner-loading-wrapper")).not.toBeNull());
  return shadow().querySelector<HTMLElement>(".sonner-loading-wrapper")!;
}

beforeEach(reset);
afterEach(async () => {
  await commands.emulateMedia({ reducedMotion: null, forcedColors: null });
});

it("keeps the spinner animating under prefers-reduced-motion", async () => {
  await commands.emulateMedia({ reducedMotion: "reduce" });
  const spinner = await loadingToast();

  expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
  // `animation: none` would empty getAnimations(), which toast.promise() reads to carry the
  // spinner phase over to the replacing toast — so an opacity pulse is used instead
  await vi.waitFor(() => expect(spinner.getAnimations().length).toBeGreaterThan(0));
  const name = getComputedStyle(spinner).animationName;
  expect(name).not.toBe("none");
  expect(name).toBe("sonner-pulse");
});

it("uses the rotation when motion is allowed", async () => {
  const spinner = await loadingToast();

  expect(getComputedStyle(spinner).animationName).toBe("sonner-spin");
  expect(spinner.getAnimations().length).toBeGreaterThan(0);
});

it("drops the toast slide transition under prefers-reduced-motion", async () => {
  await commands.emulateMedia({ reducedMotion: "reduce" });
  toast("hello");
  await vi.waitFor(() => expect(shadow().querySelectorAll("li")).toHaveLength(1));

  // the opacity cross-fade stays, since the visibility switch relies on it; the movement goes
  const transition = getComputedStyle(shadow().querySelector("li")!).transitionProperty;
  expect(transition).toContain("opacity");
  expect(transition).not.toContain("transform");
});

it("keeps the spinner painted in forced-colors mode", async () => {
  await commands.emulateMedia({ forcedColors: "active" });
  await loadingToast();

  expect(matchMedia("(forced-colors: active)").matches).toBe(true);
  const bar = shadow().querySelector<HTMLElement>(".sonner-loading-bar")!;
  const { backgroundColor, opacity } = getComputedStyle(bar);
  // a gradient would not be repainted here; the bars survive because their colour is forced to
  // CanvasText while their staggered opacity is left alone
  expect(backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(Number(opacity)).toBeGreaterThan(0);
});

it("carries a visible border in forced-colors mode, where shadows are not painted", async () => {
  await commands.emulateMedia({ forcedColors: "active" });
  toast("hello");
  await vi.waitFor(() => expect(shadow().querySelectorAll("li")).toHaveLength(1));

  const style = getComputedStyle(shadow().querySelector("li")!);
  expect(style.boxShadow).toBe("none");
  expect(Number.parseFloat(style.borderTopWidth)).toBeGreaterThan(0);
});
