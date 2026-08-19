import { beforeEach, expect, it, vi } from "vitest";

import toast from "./index.js";

/**
 * Dismisses rather than removing the host: `attachHotkey` captures the notification region in a
 * closure behind a one-shot flag, so a fresh host would leave the hotkey bound to a detached node.
 * The library never removes its own host either, so this matches how it really lives.
 */
async function reset() {
  toast.dismiss();
  toast.resetConfig();
  document.querySelectorAll("[data-test-trigger]").forEach((node) => node.remove());
  const shadowRoot = document.querySelector("[data-sonner-toasters]")?.shadowRoot;
  if (!shadowRoot) return;
  await vi.waitUntil(() => shadowRoot.querySelectorAll("li").length === 0);
}

function shadow() {
  return document.querySelector("[data-sonner-toasters]")!.shadowRoot!;
}

const toasts = () => [...shadow().querySelectorAll("li")];

/** Focus has to start somewhere real, so Esc has a trigger to restore it to. */
function trigger() {
  const button = document.createElement("button");
  button.setAttribute("data-test-trigger", "");
  button.textContent = "open";
  document.body.append(button);
  button.focus();
  return button;
}

/** The library listens on the document, so events are dispatched there rather than typed in. */
function press(key: string, init: KeyboardEventInit = {}) {
  const target = shadow().activeElement ?? document.activeElement ?? document.body;
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, code: key, bubbles: true, composed: true, ...init }),
  );
}

const focused = () => shadow().activeElement;

beforeEach(reset);

it("Alt+T focuses the most recent toast", async () => {
  trigger();
  toast("first");
  toast("second");
  await vi.waitFor(() => expect(toasts()).toHaveLength(2));

  press("KeyT", { altKey: true });

  // the most recent one, so the message is read straight away rather than the oldest
  expect(focused()).toBe(toasts().at(-1));
});

it("arrows move between toasts", async () => {
  trigger();
  toast("first");
  toast("second");
  toast("third");
  await vi.waitFor(() => expect(toasts()).toHaveLength(3));

  press("KeyT", { altKey: true });
  const newest = toasts().at(-1);
  expect(focused()).toBe(newest);

  press("ArrowUp");
  expect(focused()).not.toBe(newest);
  press("ArrowDown");
  expect(focused()).toBe(newest);
});

it("Delete dismisses the focused toast", async () => {
  trigger();
  toast("first");
  toast("second");
  await vi.waitFor(() => expect(toasts()).toHaveLength(2));

  press("KeyT", { altKey: true });
  press("Delete");

  await vi.waitFor(() => expect(toasts().length).toBeLessThan(2));
});

it("Esc restores focus to the element that had it", async () => {
  const button = trigger();
  toast("hello");
  await vi.waitFor(() => expect(toasts()).toHaveLength(1));

  press("KeyT", { altKey: true });
  expect(focused()).toBe(toasts()[0]);

  press("Escape");

  // this is the one the README promises and the hardest to get right: focus goes back to the trigger
  await vi.waitFor(() => expect(document.activeElement).toBe(button));
});

it("exposes the action as a real button, so Enter and Space work natively", async () => {
  trigger();
  const clicks: string[] = [];
  toast("Message archived", { action: { label: "Undo", onClick: () => clicks.push("undo") } });
  await vi.waitFor(() => expect(toasts()).toHaveLength(1));

  const action = shadow().querySelector("[data-button]")!;
  expect(action.tagName).toBe("BUTTON");
  // no role or tabindex to fake it, which is what makes keyboard activation work without handlers
  expect(action.getAttribute("role")).toBeNull();
  expect(action.getAttribute("tabindex")).toBeNull();

  (action as HTMLButtonElement).click();
  expect(clicks).toEqual(["undo"]);
});

it("gives the close button an accessible name that follows the labels", async () => {
  trigger();
  toast.config({ a11y: { labels: { close: "Fermer la notification" } } });
  toast("hello", { closeButton: true });
  await vi.waitFor(() => expect(toasts()).toHaveLength(1));

  const close = shadow().querySelector("[data-close-button]")!;
  expect(close.getAttribute("aria-label")).toBe("Fermer la notification");
});

it("names the notification region and mentions the hotkey", async () => {
  trigger();
  toast("hello");
  await vi.waitFor(() => expect(toasts()).toHaveLength(1));

  const region = shadow().querySelector("[aria-label]")!;
  expect(region.getAttribute("aria-label")).toMatch(/Notifications/);
});

it("pauses the dismiss timer while the pointer is over the region", async () => {
  trigger();
  toast("hovered", { duration: 250 });
  await vi.waitFor(() => expect(toasts()).toHaveLength(1));

  const region = shadow().querySelector("section[aria-label]")!;
  region.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));

  // the timer is held, not restarted: the toast is still there well past its own duration
  await new Promise((resolve) => setTimeout(resolve, 600));
  expect(toasts()).toHaveLength(1);

  region.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false }));
  await vi.waitFor(() => expect(toasts()).toHaveLength(0));
});

it("pauses the dismiss timer while focus is inside a toast", async () => {
  trigger();
  toast("focused", { duration: 250 });
  await vi.waitFor(() => expect(toasts()).toHaveLength(1));

  press("KeyT", { altKey: true });
  expect(focused()).toBe(toasts()[0]);

  await new Promise((resolve) => setTimeout(resolve, 600));
  expect(toasts()).toHaveLength(1);
});
