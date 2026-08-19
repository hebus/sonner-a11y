import { regionLabel, rememberToasterPosition, setExpandSource, wireRegion } from "./a11y.js";
import { ensureAnnouncer } from "./announcer.js";
import { config, registerConfigUpdateCallback } from "./config.js";
import { Position } from "./types.js";

import style from "./style.css?inline";

function getContainer(): ShadowRoot {
  const toasters = document.querySelector("[data-sonner-toasters]")?.shadowRoot;
  if (toasters) return toasters;

  const app = document.createElement("div");
  app.setAttribute("data-sonner-toasters", "");
  document.body.appendChild(app);
  const shadow = app.attachShadow({ mode: "open" });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(style);
  shadow.adoptedStyleSheets = [sheet];
  return shadow;
}

/**
 * Persistent wrapper around every <ol>, unlike the toasters themselves which are created on demand
 * and removed as soon as they are empty. It is the stable target for the pointer, focus and keyboard
 * listeners, and it carries the accessible name of the whole area.
 *
 * Never give this node a `transform`, `filter`, `backdrop-filter`, `perspective`, `contain` or
 * `will-change`: it would become the containing block of the `position: fixed` toasters and break
 * every position. It needs no CSS at all.
 */
export function getRegion(): HTMLElement {
  const shadow = getContainer();

  const existing = shadow.querySelector<HTMLElement>("section[data-sonner-region]");
  if (existing) return existing;

  const region = document.createElement("section");
  region.setAttribute("data-sonner-region", "");
  region.setAttribute("tabindex", "-1");
  // <section> + aria-label implies role="region", so it shows up as a landmark
  region.setAttribute("aria-label", regionLabel());
  shadow.appendChild(region);

  wireRegion(region, shadow);
  // created here so a toast.config() call at boot warms the live region up long before the first toast
  ensureAnnouncer();

  return region;
}

function updateToasterConfig() {
  const region = getRegion();
  // the hotkey and the region label are both configurable after the region was created
  region.setAttribute("aria-label", regionLabel());

  region.querySelectorAll<HTMLElement>("[data-sonner-toaster]").forEach((toaster) => {
    toaster.setAttribute("data-sonner-theme", config.theme);
    toaster.setAttribute("dir", config.dir);

    toaster.style.setProperty("--gap", `${config.gap}px`);
    toaster.style.setProperty("--offset", `${config.offset}px`);
    toaster.style.setProperty("--mobile-offset", `${config.mobileOffset}px`);

    // goes through setExpandSource so a stack expanded by focus is not collapsed from under the user
    setExpandSource(toaster, "hover", false);
    // visibleToasts may have changed, which decides who is hidden from assistive technologies
    assignOffset(toaster);
  });
}

export function getToaster(position: Position) {
  const region = getRegion();
  rememberToasterPosition(position);

  const el = region.querySelector(`ol[data-position="${position}"]`);
  if (el) return el;

  const toaster = document.createElement("ol");
  toaster.setAttribute("data-sonner-toaster", "");
  // list-style: none strips the list/listitem semantics on WebKit, so restore them explicitly
  toaster.setAttribute("role", "list");
  toaster.setAttribute("tabindex", "-1");

  toaster.setAttribute("data-position", position);
  toaster.setAttribute("data-expand", config.expand.toString());
  toaster.setAttribute("data-sonner-theme", config.theme);
  toaster.setAttribute("dir", config.dir);

  toaster.style.setProperty("--gap", `${config.gap}px`);
  toaster.style.setProperty("--offset", `${config.offset}px`);
  toaster.style.setProperty("--mobile-offset", `${config.mobileOffset}px`);

  const observer = new MutationObserver(() => {
    if (toaster.querySelectorAll("*").length === 0) {
      observer.disconnect();
      // remove() and not container.removeChild(): the parent is the region now
      toaster.remove();
    } else {
      requestAnimationFrame(() => assignOffset(toaster));
    }
  });
  observer.observe(toaster, { childList: true });

  // hover to expand — focus does the same, through the same set of sources
  toaster.addEventListener("mouseenter", () => setExpandSource(toaster, "hover", true));
  toaster.addEventListener("mouseleave", () => setExpandSource(toaster, "hover", false));

  region.appendChild(toaster);
  return toaster;
}

export function assignOffset(container: HTMLElement) {
  const { visibleToasts, gap } = config;
  const toasts = [
    ...container.querySelectorAll('li:not([data-state="deleting"])'),
  ].reverse() as HTMLLIElement[];
  if (toasts.length === 0) return;

  const frontToast = toasts[0];
  if (!getPropertyValue(frontToast, "init-height")) {
    frontToast.style.setProperty("--init-height", `${frontToast.offsetHeight}px`);
  }

  toasts.forEach((toast, index) => {
    const nextCard = toast.nextElementSibling as HTMLLIElement;
    const offset =
      index > 0
        ? parseFloat(getPropertyValue(nextCard, "offset")) +
          parseFloat(getPropertyValue(nextCard, "init-height")) +
          gap
        : 0;

    toast.style.setProperty("--offset", `${offset}px`);
    toast.style.setProperty("--index", index.toString());

    // beyond visibleToasts the toast is hidden for good (even expanded), so CSS visibility is enough
    const hidden = index + 1 > visibleToasts;
    toast.setAttribute("data-state", hidden ? "invisible" : "mounted");
    if (!hidden) revealToast(toast);
  });

  container.style.setProperty("--front-height", `${toasts[0]?.offsetHeight}px`);
}

/** Undoes hideToast when a toast comes back within visibleToasts. */
function revealToast(toast: HTMLElement) {
  if (toast.getAttribute("aria-hidden") !== "true") return;
  toast.removeAttribute("aria-hidden");
  toast.inert = false;
  toast.setAttribute("tabindex", "0");
}

export function getOffset(el: Element): number {
  const offset = getComputedStyle(el).getPropertyValue("--offset");
  if (offset === undefined || offset.match(/%/)) return 0;
  return Math.abs(Number(offset.replace("px", "")));
}

function getPropertyValue(el: Element, key: string) {
  return getComputedStyle(el).getPropertyValue(`--${key}`);
}

// Register the config update callback to break circular dependency
registerConfigUpdateCallback(updateToasterConfig);
