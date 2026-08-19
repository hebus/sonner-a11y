import { beforeEach, expect, it, vi } from "vitest";

import toast from "./index.js";

async function reset() {
  toast.dismiss();
  toast.resetConfig();
  const shadowRoot = document.querySelector("[data-sonner-toasters]")?.shadowRoot;
  if (!shadowRoot) return;
  await vi.waitUntil(() => shadowRoot.querySelectorAll("li").length === 0);
  // the announcer is persistent by design, so its slots are emptied rather than the host removed
  document.querySelectorAll("[data-sonner-announcer] [aria-live] > div").forEach((slot) => {
    slot.textContent = "";
  });
}

const region = (politeness: "polite" | "assertive") =>
  document.querySelector(`[data-sonner-announcer] [aria-live="${politeness}"]`);

const announced = (politeness: "polite" | "assertive") => region(politeness)?.textContent ?? "";

beforeEach(reset);

it("keeps the live region in the light DOM, outside the shadow root", async () => {
  toast("hello");
  await vi.waitFor(() => expect(document.querySelector("[data-sonner-announcer]")).not.toBeNull());

  const announcer = document.querySelector("[data-sonner-announcer]")!;
  expect(announcer.getRootNode()).toBe(document);
  // the toast list is created and destroyed on demand, so a live region inside it is not reliably read
  const shadow = document.querySelector("[data-sonner-toasters]")!.shadowRoot!;
  expect(shadow.querySelector("[aria-live]")).toBeNull();
  expect(shadow.querySelector('[role="status"], [role="alert"]')).toBeNull();
});

it("announces politely by default", async () => {
  toast.success("Payment accepted");

  await vi.waitFor(() => expect(announced("polite")).toContain("Payment accepted"));
  expect(announced("assertive")).toBe("");
});

it("announces an error assertively", async () => {
  toast.error("Payment failed");

  await vi.waitFor(() => expect(announced("assertive")).toContain("Payment failed"));
  expect(announced("polite")).toBe("");
});

it("respects important: false on an error", async () => {
  toast.error("Announced politely", { important: false });

  await vi.waitFor(() => expect(announced("polite")).toContain("Announced politely"));
  expect(announced("assertive")).toBe("");
});

it("reads the severity prefix before the title, from the labels", async () => {
  toast.config({ a11y: { labels: { types: { error: "Erreur" } } } });
  toast.error("Payment failed");

  await vi.waitFor(() => expect(announced("assertive")).toContain("Payment failed"));
  // the severity is exposed as text, so it does not rely on the icon and the colour alone
  expect(announced("assertive")).toMatch(/Erreur/);
});

it("clears the announcement afterwards so it leaves the virtual cursor", async () => {
  toast.config({ a11y: { announceClearDelay: 150 } });
  toast.success("Transient");

  await vi.waitFor(() => expect(announced("polite")).toContain("Transient"));
  await vi.waitFor(() => expect(announced("polite")).toBe(""), { timeout: 3000 });
});

it("announces nothing when announcements are disabled", async () => {
  toast.config({ a11y: { announce: false } });
  toast.success("Silent");

  await new Promise((resolve) => setTimeout(resolve, 300));
  expect(announced("polite")).toBe("");
  expect(announced("assertive")).toBe("");
});
