import { config } from './config';
import { pauseTimers, resumeTimers } from './timers';
import { ToastId } from './types';

const TOAST_SELECTOR = '[data-sonner-toast]';

/** `inert` removes an element from the tab order and from the accessibility tree in one go. */
const supportsInert = typeof HTMLElement !== 'undefined' && 'inert' in HTMLElement.prototype;

/** Registered per toast by toast.ts, so a11y.ts imports neither toast.ts nor toaster.ts. */
type ToastHandlersType = { id: ToastId; requestDismiss: () => void };

const toastHandlers = new WeakMap<HTMLElement, ToastHandlersType>();

export function registerToastHandlers(el: HTMLElement, handlers: ToastHandlersType) {
    toastHandlers.set(el, handlers);
}

/** document.activeElement stops at the shadow host, so walk down into the shadow roots. */
export function getDeepActiveElement(): Element | null {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return active;
}

// -- focus memory ---------------------------------------------------------------------------------

let lastFocusedElement: HTMLElement | null = null;
let focusTracked = false;

/**
 * Tracked continuously rather than only when the hotkey fires: a user who tabs into a toast and
 * dismisses it would otherwise have no point to return to.
 */
function trackOutsideFocus() {
    if (focusTracked) return;
    focusTracked = true;

    document.addEventListener(
        'focusin',
        event => {
            const target = event.target as Element | null;
            // shadow root events are retargeted onto the host, which is what we filter out here
            if (!target || typeof target.closest !== 'function' || target.closest('[data-sonner-toasters]')) return;
            lastFocusedElement = target as HTMLElement;
        },
        true,
    );
}

export function restoreFocus() {
    const target = lastFocusedElement;
    if (target?.isConnected && typeof target.focus === 'function') {
        target.focus({ preventScroll: true });
        return;
    }
    // no document.body.focus(): without a tabindex it is a no-op in several browsers
    (getDeepActiveElement() as HTMLElement | null)?.blur();
}

// -- toast lookup ---------------------------------------------------------------------------------

function isFocusable(toast: HTMLElement) {
    const state = toast.getAttribute('data-state');
    // 'invisible' is beyond visibleToasts, so the CSS puts it at visibility: hidden and focus() would silently fail
    return state !== 'deleting' && state !== 'invisible' && !toast.hasAttribute('inert') && toast.getAttribute('aria-hidden') !== 'true';
}

function focusableToasts(toaster: Element | null): HTMLElement[] {
    if (!toaster) return [];
    return [...toaster.querySelectorAll<HTMLElement>(TOAST_SELECTOR)].filter(isFocusable);
}

function closestToast(target: EventTarget | null): HTMLElement | null {
    const el = target as Element | null;
    if (!el || typeof el.closest !== 'function') return null;
    return el.closest<HTMLElement>(TOAST_SELECTOR);
}

function closestToaster(target: EventTarget | null): HTMLElement | null {
    const el = target as Element | null;
    if (!el || typeof el.closest !== 'function') return null;
    return el.closest<HTMLElement>('[data-sonner-toaster]');
}

function siblingToast(toast: HTMLElement, direction: 1 | -1): HTMLElement | null {
    const all = focusableToasts(toast.parentElement);
    const index = all.indexOf(toast);
    if (index === -1) return all[all.length - 1] ?? null;
    return all[index + direction] ?? null;
}

export function focusToast(toast: HTMLElement | null) {
    if (!toast) return;
    toast.focus({ preventScroll: true });
}

let lastToasterPosition: string | null = null;

export function rememberToasterPosition(position: string) {
    lastToasterPosition = position;
}

/** Most recent focusable toast of the most recently fed toaster. */
function focusTarget(region: HTMLElement): HTMLElement | null {
    const preferred = lastToasterPosition && region.querySelector(`ol[data-position="${lastToasterPosition}"]`);
    const toasters = preferred ? [preferred] : [...region.querySelectorAll('[data-sonner-toaster]')].reverse();

    for (const toaster of toasters) {
        const toasts = focusableToasts(toaster);
        if (toasts.length > 0) return toasts[toasts.length - 1];
    }
    return null;
}

// -- expand ---------------------------------------------------------------------------------------

type ExpandSourceType = 'hover' | 'focus';

const expandSources = new WeakMap<HTMLElement, Set<ExpandSourceType>>();

/**
 * Two independent sources can expand the stack. The previous one-shot mouseleave pattern collapsed
 * the stack under the fingers of a keyboard user as soon as the pointer left.
 */
export function setExpandSource(toaster: HTMLElement | null, source: ExpandSourceType, active: boolean) {
    if (!toaster) return;

    let sources = expandSources.get(toaster);
    if (!sources) expandSources.set(toaster, (sources = new Set()));

    active ? sources.add(source) : sources.delete(source);
    toaster.setAttribute('data-expand', (config.expand || sources.size > 0).toString());
}

function collapseAll(region: HTMLElement) {
    region.querySelectorAll<HTMLElement>('[data-sonner-toaster]').forEach(toaster => setExpandSource(toaster, 'focus', false));
}

// -- hiding ---------------------------------------------------------------------------------------

/**
 * A dismissed toast stays in the DOM for the exit animation at opacity 0, where it would otherwise
 * remain focusable and readable by a screen reader.
 */
export function hideToast(toast: HTMLElement) {
    toast.setAttribute('aria-hidden', 'true');
    if (supportsInert) {
        toast.inert = true;
        return;
    }
    // without inert, aria-hidden on a focusable element is itself a violation
    toast.setAttribute('tabindex', '-1');
}

// -- labels ---------------------------------------------------------------------------------------

export function hotkeyLabel(): string {
    return config.a11y.hotkey.join('+').replace(/Key|Digit/g, '');
}

export function regionLabel(): string {
    const label = config.a11y.labels.region;
    const hotkey = hotkeyLabel();
    return label.includes('{hotkey}') ? label.replace('{hotkey}', hotkey) : `${label} (${hotkey})`;
}

// -- hotkey ---------------------------------------------------------------------------------------

let hotkeyAttached = false;
let visibilityAttached = false;

function attachHotkey(region: HTMLElement) {
    if (hotkeyAttached) return;
    hotkeyAttached = true;

    document.addEventListener('keydown', event => {
        // same predicate as sonner: modifier properties and/or KeyboardEvent.code
        const pressed = config.a11y.hotkey.every(key => (event as unknown as Record<string, boolean>)[key] || event.code === key);
        if (!pressed) return;

        const target = focusTarget(region);
        // do not steal focus when there is nothing to read
        if (!target) return;

        // alt+T would otherwise open a browser menu
        event.preventDefault();
        setExpandSource(closestToaster(target), 'focus', true);
        focusToast(target);
    });
}

// -- keyboard model -------------------------------------------------------------------------------

function requestToastDismiss(toast: HTMLElement) {
    const handlers = toastHandlers.get(toast);
    // same path as the swipe gesture, user callbacks included
    if (handlers) handlers.requestDismiss();
}

function onRegionKeydown(event: KeyboardEvent, region: HTMLElement) {
    const toast = closestToast(event.target);

    if (event.key === 'Escape') {
        event.preventDefault();
        if (config.a11y.dismissOnEscape && toast) {
            requestToastDismiss(toast);
            return;
        }
        collapseAll(region);
        restoreFocus();
        return;
    }

    if (!toast) return;

    if (config.a11y.dismissKeys.includes(event.key)) {
        // Backspace still triggers legacy back-navigation in some browsers
        event.preventDefault();
        requestToastDismiss(toast);
        return;
    }

    switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
            event.preventDefault();
            focusToast(siblingToast(toast, 1));
            break;
        case 'ArrowUp':
        case 'ArrowLeft':
            event.preventDefault();
            focusToast(siblingToast(toast, -1));
            break;
        case 'Home':
            event.preventDefault();
            focusToast(focusableToasts(toast.parentElement)[0] ?? null);
            break;
        case 'End': {
            event.preventDefault();
            const toasts = focusableToasts(toast.parentElement);
            focusToast(toasts[toasts.length - 1] ?? null);
            break;
        }
    }
}

// -- wiring ---------------------------------------------------------------------------------------

/**
 * Wired once on the persistent <section>. Listening there rather than on each <li> means a single
 * enter/leave pair for the whole area: the pointer crossing the gap between two expanded toasts no
 * longer restarts every timer.
 */
export function wireRegion(region: HTMLElement, shadow: ShadowRoot) {
    trackOutsideFocus();
    attachHotkey(region);

    region.addEventListener('mouseenter', () => {
        if (config.a11y.pauseOnHover) pauseTimers('hover');
    });

    // unconditional resume: flipping the option off mid-hover must not freeze the timers for good
    region.addEventListener('mouseleave', () => resumeTimers('hover'));

    region.addEventListener('focusin', event => {
        if (config.a11y.pauseOnFocus) pauseTimers('focus');
        setExpandSource(closestToaster(event.target), 'focus', true);
    });

    region.addEventListener('focusout', () => {
        // relatedTarget is unreliable across a shadow boundary, so check the real state next frame
        requestAnimationFrame(() => {
            if (region.contains(shadow.activeElement)) return;
            resumeTimers('focus');
            collapseAll(region);
        });
    });

    region.addEventListener('keydown', event => onRegionKeydown(event, region));

    if (visibilityAttached) return;
    visibilityAttached = true;
    document.addEventListener('visibilitychange', () => {
        if (!config.a11y.pauseOnDocumentHidden) return;
        document.hidden ? pauseTimers('hidden') : resumeTimers('hidden');
    });
}

/**
 * Called while dismissing. Order matters: test for focus first, then hide (setting inert on an
 * element that contains focus blurs to <body>), then move focus.
 */
export function handleToastRemoved(toast: HTMLElement, shadow: ShadowRoot | null) {
    const active = shadow?.activeElement ?? null;
    const hadFocus = !!active && (active === toast || toast.contains(active));
    const next = hadFocus ? (siblingToast(toast, 1) ?? siblingToast(toast, -1)) : null;

    hideToast(toast);
    if (!hadFocus) return;

    next ? focusToast(next) : restoreFocus();
}
