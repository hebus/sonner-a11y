import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The module keeps the timer map and the pause reasons at module scope, so every test gets a fresh
// copy through a dynamic import after resetModules().
async function loadTimers() {
  return import("./timers");
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("startTimer", () => {
  it("expires after the requested duration", async () => {
    const { startTimer } = await loadTimers();
    const onExpire = vi.fn<() => void>();

    startTimer("a", 1000, onExpire);

    vi.advanceTimersByTime(999);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("never schedules a non-positive duration", async () => {
    const { startTimer } = await loadTimers();
    const onExpire = vi.fn<() => void>();

    startTimer("a", 0, onExpire);

    vi.advanceTimersByTime(60_000);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("drops the previous timer when an id is reused", async () => {
    const { startTimer } = await loadTimers();
    const first = vi.fn<() => void>();
    const second = vi.fn<() => void>();

    // toast.promise reuses the id: the old timer would otherwise close the replacement early
    startTimer("a", 1000, first);
    vi.advanceTimersByTime(900);
    startTimer("a", 1000, second);
    vi.advanceTimersByTime(1000);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe("clearTimer", () => {
  it("cancels a pending timer", async () => {
    const { startTimer, clearTimer } = await loadTimers();
    const onExpire = vi.fn<() => void>();

    startTimer("a", 1000, onExpire);
    clearTimer("a");
    vi.advanceTimersByTime(5000);

    expect(onExpire).not.toHaveBeenCalled();
  });
});

describe("pauseTimers / resumeTimers", () => {
  it("holds the remaining time and resumes from it", async () => {
    const { startTimer, pauseTimers, resumeTimers } = await loadTimers();
    const onExpire = vi.fn<() => void>();

    startTimer("a", 1000, onExpire);
    vi.advanceTimersByTime(400);
    pauseTimers("hover");

    vi.advanceTimersByTime(10_000);
    expect(onExpire).not.toHaveBeenCalled();

    resumeTimers("hover");
    vi.advanceTimersByTime(599);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("only resumes once every reason is released", async () => {
    const { startTimer, pauseTimers, resumeTimers } = await loadTimers();
    const onExpire = vi.fn<() => void>();

    startTimer("a", 1000, onExpire);
    pauseTimers("hover");
    pauseTimers("focus");

    resumeTimers("hover");
    vi.advanceTimersByTime(5000);
    expect(onExpire).not.toHaveBeenCalled();

    resumeTimers("focus");
    vi.advanceTimersByTime(1000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("is idempotent: pausing twice for the same reason does not double the remaining time", async () => {
    const { startTimer, pauseTimers, resumeTimers } = await loadTimers();
    const onExpire = vi.fn<() => void>();

    startTimer("a", 1000, onExpire);
    vi.advanceTimersByTime(400);
    pauseTimers("hover");
    pauseTimers("hover");
    resumeTimers("hover");

    vi.advanceTimersByTime(600);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("ignores a reason that was never held", async () => {
    const { startTimer, pauseTimers, resumeTimers } = await loadTimers();
    const onExpire = vi.fn<() => void>();

    startTimer("a", 1000, onExpire);
    pauseTimers("hover");
    resumeTimers("hidden");

    vi.advanceTimersByTime(5000);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("starts a toast paused when a reason already holds", async () => {
    const { startTimer, pauseTimers, resumeTimers } = await loadTimers();
    const onExpire = vi.fn<() => void>();

    pauseTimers("hidden");
    startTimer("a", 1000, onExpire);
    vi.advanceTimersByTime(5000);
    expect(onExpire).not.toHaveBeenCalled();

    resumeTimers("hidden");
    vi.advanceTimersByTime(1000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
