import { ToastId } from "./types";

export type PauseReasonType = "hover" | "focus" | "hidden";

type TimerType = {
  timeoutId: number | null;
  remainingTime: number;
  startTime: number;
  onExpire: () => void;
};

const timers = new Map<ToastId, TimerType>();

/**
 * Timers are paused while at least one reason holds. Using a set of reasons rather than a counter
 * makes pause/resume idempotent by construction: hovering and focusing at the same time pauses once,
 * and playback only resumes once every reason is released.
 */
const pauseReasons = new Set<PauseReasonType>();

function schedule(id: ToastId, timer: TimerType) {
  timer.startTime = Date.now();
  timer.timeoutId = setTimeout(
    () => {
      timers.delete(id);
      timer.onExpire();
    },
    Math.max(timer.remainingTime, 0),
  );
}

export function startTimer(id: ToastId, duration: number, onExpire: () => void) {
  // an id can be reused (toast.promise): drop the previous timer or it would close the new toast early
  clearTimer(id);
  if (!(duration > 0)) return;

  const timer: TimerType = {
    timeoutId: null,
    remainingTime: duration,
    startTime: Date.now(),
    onExpire,
  };
  timers.set(id, timer);
  if (pauseReasons.size === 0) schedule(id, timer);
}

export function clearTimer(id: ToastId) {
  const timer = timers.get(id);
  if (!timer) return;
  if (timer.timeoutId !== null) clearTimeout(timer.timeoutId);
  timers.delete(id);
}

export function pauseTimers(reason: PauseReasonType) {
  const alreadyPaused = pauseReasons.size > 0;
  pauseReasons.add(reason);
  if (alreadyPaused) return;

  timers.forEach((timer) => {
    if (timer.timeoutId === null) return;
    clearTimeout(timer.timeoutId);
    timer.timeoutId = null;
    // clamped: a long pause would otherwise leave a negative delay and close the toast instantly
    timer.remainingTime = Math.max(timer.remainingTime - (Date.now() - timer.startTime), 0);
  });
}

export function resumeTimers(reason: PauseReasonType) {
  if (!pauseReasons.delete(reason) || pauseReasons.size > 0) return;

  timers.forEach((timer, id) => {
    if (timer.timeoutId === null) schedule(id, timer);
  });
}
