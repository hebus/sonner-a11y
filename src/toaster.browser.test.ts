import axe from "axe-core";
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
  const shadowRoot = document.querySelector("[data-sonner-toasters]")?.shadowRoot;
  if (!shadowRoot) return;
  await vi.waitUntil(() => shadowRoot.querySelectorAll("li").length === 0);
}

/** The announcer is deliberately persistent, so it is reused rather than removed between tests. */
function shadow() {
  return document.querySelector("[data-sonner-toasters]")!.shadowRoot!;
}

const toasts = () => shadow().querySelectorAll("li");

beforeEach(reset);

it("renders into a shadow root carrying the stylesheet", async () => {
  toast("hello");
  await vi.waitFor(() => expect(document.querySelector("[data-sonner-toasters]")).not.toBeNull());

  const host = document.querySelector("[data-sonner-toasters]")!;
  expect(host.shadowRoot).not.toBeNull();
  // constructable stylesheet rather than a <style> element, so a strict style-src CSP allows it
  expect(host.shadowRoot!.adoptedStyleSheets).toHaveLength(1);
  expect(host.shadowRoot!.adoptedStyleSheets[0].cssRules.length).toBeGreaterThan(10);
});

it("keeps the list semantics WebKit strips with list-style: none", async () => {
  toast("hello");
  await vi.waitFor(() => expect(toasts()).toHaveLength(1));

  const list = shadow().querySelector("ol")!;
  // explicit role: `list-style: none` drops the implicit list semantics on WebKit
  expect(list.getAttribute("role")).toBe("list");
  expect(toasts()[0].tagName).toBe("LI");
  expect(toasts()[0].parentElement).toBe(list);
  // explicit too: these <li> are `display: flex`, and a non-list-item display drops the implicit
  // `listitem` role on WebKit even when the parent carries role="list"
  expect(toasts()[0].getAttribute("role")).toBe("listitem");
});

it("inserts the title as plain text unless titleAsHtml is set", async () => {
  toast("<b>bold</b>");
  await vi.waitFor(() => expect(toasts()).toHaveLength(1));
  expect(shadow().querySelector("b")).toBeNull();
  expect(toasts()[0].textContent).toContain("<b>bold</b>");

  await reset();
  toast("<b>bold</b>", { titleAsHtml: true });
  await vi.waitFor(() => expect(shadow().querySelector("b")).not.toBeNull());
});

it("passes axe on every toast type", async () => {
  for (const type of ["success", "error", "info", "warning", "loading"] as const) {
    toast[type](`a ${type} toast`, { description: "with a description", closeButton: true });
  }
  await vi.waitFor(() => expect(toasts().length).toBeGreaterThanOrEqual(3));

  // axe reaches into the shadow root on its own; the host is passed so the page chrome is excluded
  const results = await axe.run(document.querySelector("[data-sonner-toasters]")!, {
    resultTypes: ["violations"],
  });
  expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
});

it("passes axe in every position", async () => {
  for (const position of [
    "top-left",
    "top-center",
    "top-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
  ] as const) {
    await reset();
    toast.config({ toastOptions: { position } });
    toast.success("positioned", {
      closeButton: true,
      action: { label: "Undo", onClick: () => {} },
    });
    await vi.waitFor(() => expect(toasts()).toHaveLength(1));

    const results = await axe.run(document.querySelector("[data-sonner-toasters]")!, {
      resultTypes: ["violations"],
    });
    expect(results.violations.map((violation) => `${position} — ${violation.id}`)).toEqual([]);
  }
});

it("leaves the viewport as the containing block for the fixed toasts", async () => {
  toast.config({ toastOptions: { position: "bottom-right" } });
  toast("anchored");
  await vi.waitFor(() => expect(toasts()).toHaveLength(1));
  await vi.waitFor(() => expect(toasts()[0].getAttribute("data-state")).toBe("mounted"));

  const list = shadow().querySelector<HTMLElement>("[data-sonner-toaster]")!;
  expect(getComputedStyle(list).position).toBe("fixed");
  // guards the invariant directly: a `transform`, `filter`, `contain` or `will-change` on
  // `[data-sonner-toasters]` would make it the containing block, and `offsetParent` would report it
  // instead of null — every position then shifts to the wrapper rather than the viewport
  expect(list.offsetParent).toBeNull();

  const wrapper = document.querySelector<HTMLElement>("[data-sonner-toasters]")!;
  const wrapperStyle = getComputedStyle(wrapper);
  expect(wrapperStyle.transform).toBe("none");
  expect(wrapperStyle.filter).toBe("none");
  expect(wrapperStyle.contain).toBe("none");
  expect(wrapperStyle.willChange).toBe("auto");
  expect(wrapperStyle.perspective).toBe("none");
});
