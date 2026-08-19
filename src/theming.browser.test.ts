import { afterEach, beforeEach, expect, it, vi } from "vitest";

import toast from "./index.js";

/**
 * Theming crosses the shadow boundary, so it needs a real browser: happy-dom resolves neither
 * custom-property inheritance into a shadow tree nor `var()` fallbacks.
 *
 * The public contract is one name per role — `--sonner-error-bg` and friends. Internally each is
 * read once into a private `--_sonner-*` twin carrying the shipped default as its `var()` fallback,
 * which is what lets a consumer override a single token without restating the whole palette.
 */
const PUBLIC_TOKENS = [
  "--sonner-normal-bg",
  "--sonner-normal-text",
  "--sonner-error-bg",
  "--sonner-border-radius",
];

function host() {
  return document.querySelector<HTMLElement>("[data-sonner-toasters]")!;
}

function shadow() {
  return host().shadowRoot!;
}

/** Dismisses rather than removing the host: the library never removes its own host either. */
async function reset() {
  toast.dismiss();
  toast.resetConfig();
  for (const token of PUBLIC_TOKENS) {
    document.documentElement.style.removeProperty(token);
    document.querySelector<HTMLElement>("[data-sonner-toasters]")?.style.removeProperty(token);
  }
  const shadowRoot = document.querySelector("[data-sonner-toasters]")?.shadowRoot;
  if (!shadowRoot) return;
  await vi.waitUntil(() => shadowRoot.querySelectorAll("li").length === 0);
}

/** Raises a toast and hands back the `<li>`, once it is actually in the shadow tree. */
async function raise(type?: "error") {
  if (type === "error") toast.error("hello");
  else toast("hello");
  await vi.waitFor(() => expect(document.querySelector("[data-sonner-toasters]")).not.toBeNull());
  await vi.waitFor(() => expect(shadow().querySelectorAll("li")).toHaveLength(1));
  return shadow().querySelector("li")!;
}

beforeEach(reset);
afterEach(reset);

it("paints the shipped default when nothing is overridden", async () => {
  const li = await raise();
  expect(getComputedStyle(li).backgroundColor).toBe("rgb(255, 255, 255)");
  expect(getComputedStyle(li).borderRadius).toBe("8px");
});

it("lets a token set on the host win over the shipped default", async () => {
  const li = await raise();
  host().style.setProperty("--sonner-normal-bg", "rgb(1, 2, 3)");
  expect(getComputedStyle(li).backgroundColor).toBe("rgb(1, 2, 3)");
});

it("inherits a token set on :root across the shadow boundary", async () => {
  // The host lives in `document.body`, so a token on the document root reaches the shadow tree by
  // inheritance — this is the only channel an application's own stylesheet has.
  document.documentElement.style.setProperty("--sonner-normal-text", "rgb(4, 5, 6)");
  const li = await raise();
  expect(getComputedStyle(li).color).toBe("rgb(4, 5, 6)");
});

it("themes a severity colour, which needs richColors", async () => {
  toast.config({ toastOptions: { richColors: true } });
  document.documentElement.style.setProperty("--sonner-error-bg", "rgb(7, 8, 9)");
  const li = await raise("error");
  expect(li.getAttribute("data-type")).toBe("error");
  expect(getComputedStyle(li).backgroundColor).toBe("rgb(7, 8, 9)");
});

it("keeps one public name winning in both themes", async () => {
  // Light and dark declare different defaults for the same role, but a single public token
  // overrides both: the consumer's own value is expected to be theme-aware already.
  document.documentElement.style.setProperty("--sonner-normal-bg", "rgb(10, 11, 12)");

  toast.config({ theme: "light" });
  let li = await raise();
  expect(getComputedStyle(li).backgroundColor).toBe("rgb(10, 11, 12)");

  toast.dismiss();
  await vi.waitUntil(() => shadow().querySelectorAll("li").length === 0);

  toast.config({ theme: "dark" });
  li = await raise();
  expect(getComputedStyle(li).backgroundColor).toBe("rgb(10, 11, 12)");
});

it("themes geometry, not only colour", async () => {
  // `--sonner-border-radius` rather than `--sonner-width`: under 600px the sheet gives the toast
  // `width: calc(100% - …)`, so the width token is inert at the size the test browser runs at.
  document.documentElement.style.setProperty("--sonner-border-radius", "2px");
  const li = await raise();
  expect(getComputedStyle(li).borderRadius).toBe("2px");
});
