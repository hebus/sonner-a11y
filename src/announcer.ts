import { config } from "./config";

type PolitenessType = "polite" | "assertive";

type ChannelType = {
  slots: [HTMLElement, HTMLElement];
  next: 0 | 1;
  pending: string[];
  scheduled: boolean;
  clearTimeoutId: number | null;
};

/**
 * Toasts live in a shadow root whose <ol> is created lazily and removed as soon as it is empty,
 * so a live region placed in there would always be brand new when the mutation happens.
 * The announcer is therefore a dedicated, persistent node in the light DOM, and it is the single
 * announcement channel: nothing in the shadow root carries aria-live or role="status"/"alert".
 */
let channels: Record<PolitenessType, ChannelType> | null = null;

/** True until the first flush, so a cold announcer gets extra time to be registered by the AT. */
let justCreated = false;

// clip-based hiding only: display:none / visibility:hidden / [hidden] would suppress the announcement
const HIDDEN_CSS =
  "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0;";

export function ensureAnnouncer() {
  if (channels || typeof document === "undefined" || !document.body) return;

  const host = document.createElement("div");
  host.setAttribute("data-sonner-announcer", "");
  // cssText goes through the CSSOM, so a strict `style-src` CSP does not block it
  host.style.cssText = HIDDEN_CSS;

  const createChannel = (politeness: PolitenessType): ChannelType => {
    const region = document.createElement("div");
    region.setAttribute("aria-live", politeness);
    // explicit: role="status" would imply aria-atomic="true" and re-read the previous message
    region.setAttribute("aria-atomic", "false");
    region.setAttribute("aria-relevant", "additions text");

    const slots: [HTMLElement, HTMLElement] = [
      document.createElement("div"),
      document.createElement("div"),
    ];
    slots.forEach((slot) => region.appendChild(slot));
    host.appendChild(region);

    return { slots, next: 0, pending: [], scheduled: false, clearTimeoutId: null };
  };

  channels = { polite: createChannel("polite"), assertive: createChannel("assertive") };
  document.body.appendChild(host);
  justCreated = true;
}

/** requestAnimationFrame does not run in a hidden tab, which would strand the announcement. */
function nextFrame(callback: () => void) {
  if (document.hidden) {
    setTimeout(callback, 16);
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(callback));
}

export function announce(text: string, politeness: PolitenessType = "polite") {
  if (!config.a11y.announce) return;

  ensureAnnouncer();
  const message = text.replace(/\s+/g, " ").trim();
  if (!channels || !message) return;

  const channel = channels[politeness];
  channel.pending.push(message);
  if (channel.scheduled) return;
  channel.scheduled = true;

  if (justCreated) {
    justCreated = false;
    setTimeout(() => flush(channel), 100);
    return;
  }

  nextFrame(() => flush(channel));
}

function flush(channel: ChannelType) {
  channel.scheduled = false;
  // messages queued within the same frame are joined: writing twice into one slot would lose the first
  const message = channel.pending.join(". ");
  channel.pending.length = 0;
  if (!message) return;

  if (channel.clearTimeoutId !== null) clearTimeout(channel.clearTimeoutId);

  // alternating slots: two identical consecutive messages land in different nodes, so both are announced
  const slot = channel.slots[channel.next];
  channel.slots[channel.next === 0 ? 1 : 0].textContent = "";
  channel.next = channel.next === 0 ? 1 : 0;
  slot.textContent = message;

  // clear it afterwards, otherwise the duplicated text stays in the virtual cursor's reading order
  channel.clearTimeoutId = setTimeout(() => {
    slot.textContent = "";
    channel.clearTimeoutId = null;
  }, config.a11y.announceClearDelay);
}
