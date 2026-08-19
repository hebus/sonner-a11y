import { beforeEach, describe, expect, it, vi } from "vitest";

// A cold announcer waits 100ms before its first flush so the AT has time to register the region;
// every later announcement goes through two nested requestAnimationFrame calls (16ms each here).
const COLD_START = 100;
const TWO_FRAMES = 32;

async function loadAnnouncer() {
  vi.resetModules();
  document.body.innerHTML = "";
  return { announcer: await import("./announcer.js"), config: await import("./config.js") };
}

function region(politeness: "polite" | "assertive") {
  return document.querySelector(`[data-sonner-announcer] [aria-live="${politeness}"]`);
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "Date", "requestAnimationFrame", "cancelAnimationFrame"],
  });
});

describe("ensureAnnouncer", () => {
  it("creates one clip-hidden host holding a polite and an assertive region", async () => {
    const { announcer } = await loadAnnouncer();

    announcer.ensureAnnouncer();

    const host = document.querySelector("[data-sonner-announcer]") as HTMLElement;
    expect(host).not.toBeNull();
    // display:none or [hidden] would suppress the announcement entirely
    expect(host.style.clipPath).toBe("inset(50%)");
    expect(host.style.display).toBe("");
    expect(region("polite")).not.toBeNull();
    expect(region("assertive")).not.toBeNull();
    // role="status" would imply aria-atomic="true" and re-read the previous message
    expect(region("polite")!.getAttribute("aria-atomic")).toBe("false");
    expect(region("polite")!.children).toHaveLength(2);
  });

  it("is idempotent", async () => {
    const { announcer } = await loadAnnouncer();

    announcer.ensureAnnouncer();
    announcer.ensureAnnouncer();

    expect(document.querySelectorAll("[data-sonner-announcer]")).toHaveLength(1);
  });
});

describe("announce", () => {
  it("writes the message into the polite region after the cold start", async () => {
    const { announcer } = await loadAnnouncer();

    announcer.announce("Payment received");

    expect(region("polite")!.textContent).toBe("");
    vi.advanceTimersByTime(COLD_START);
    expect(region("polite")!.textContent).toBe("Payment received");
  });

  it("routes an assertive announcement to the assertive region only", async () => {
    const { announcer } = await loadAnnouncer();

    announcer.announce("Card declined", "assertive");
    vi.advanceTimersByTime(COLD_START);

    expect(region("assertive")!.textContent).toBe("Card declined");
    expect(region("polite")!.textContent).toBe("");
  });

  it("collapses whitespace and ignores an empty message", async () => {
    const { announcer } = await loadAnnouncer();

    announcer.announce("  Saved \n  the   draft  ");
    vi.advanceTimersByTime(COLD_START);
    expect(region("polite")!.textContent).toBe("Saved the draft");

    announcer.announce("   ");
    vi.advanceTimersByTime(COLD_START + TWO_FRAMES);
    expect(region("polite")!.textContent).toBe("Saved the draft");
  });

  it("joins messages queued within the same frame", async () => {
    const { announcer } = await loadAnnouncer();

    // writing twice into one slot would lose the first message
    announcer.announce("First");
    announcer.announce("Second");
    vi.advanceTimersByTime(COLD_START);

    expect(region("polite")!.textContent).toBe("First. Second");
  });

  it("alternates slots so two identical messages are both announced", async () => {
    const { announcer } = await loadAnnouncer();

    announcer.announce("Copied");
    vi.advanceTimersByTime(COLD_START);
    const [firstSlot, secondSlot] = Array.from(region("polite")!.children);
    expect(firstSlot.textContent).toBe("Copied");

    announcer.announce("Copied");
    vi.advanceTimersByTime(TWO_FRAMES);

    expect(secondSlot.textContent).toBe("Copied");
    expect(firstSlot.textContent).toBe("");
  });

  it("clears the slot after announceClearDelay so it leaves the virtual cursor", async () => {
    const { announcer, config } = await loadAnnouncer();

    announcer.announce("Transient");
    vi.advanceTimersByTime(COLD_START);
    expect(region("polite")!.textContent).toBe("Transient");

    vi.advanceTimersByTime(config.config.a11y.announceClearDelay);
    expect(region("polite")!.textContent).toBe("");
  });

  it("does nothing when announcements are disabled", async () => {
    const { announcer, config } = await loadAnnouncer();
    config.setConfig({ a11y: { announce: false } });

    announcer.announce("Silent");
    vi.advanceTimersByTime(COLD_START + TWO_FRAMES);

    expect(document.querySelector("[data-sonner-announcer]")).toBeNull();
  });
});
