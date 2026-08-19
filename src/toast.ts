import { handleToastRemoved, registerToastHandlers, restoreFocus } from './a11y';
import { announce } from './announcer';
import { closeIcon } from './assets';
import { errorIcon, infoIcon, loadingIcon, successIcon, warningIcon } from './assets';
import { config, resolvePoliteness } from './config';
import { clearTimer, startTimer } from './timers';
import { assignOffset, getToaster } from './toaster';
import { __unsafeCreateTrustedHtml } from './trusted-types';
import { ToastType } from './types';

const icons = { success: successIcon, error: errorIcon, info: infoIcon, warning: warningIcon, loading: loadingIcon };

const toastMap = new Map<number | string, HTMLElement>();

let loadingCurrentTime: CSSNumberish | null = null;

/**
 * Drives the `id` of the title and description nodes. A user-supplied toast id cannot be used here:
 * it may contain spaces or quotes, which would break aria-labelledby (a space separated list).
 */
let toastUid = 0;

export function addToast(options: ToastType) {
    const id = options.id ?? crypto.randomUUID();
    const uid = ++toastUid;

    const data = Object.assign({}, config.toastOptions, options);
    const { duration, closeButton, position, richColors, invert, important, titleAsHtml, onDismiss, onAutoClose } = data;

    const toaster = getToaster(position);

    const oldToast = (options.id && toastMap.get(id)?.isConnected && toastMap.get(id)) || null;
    const toast: HTMLElement = document.createElement('li');

    toast.setAttribute('data-sonner-toast', '');
    // focusable so the toast can be reached by Tab and by the hotkey
    toast.setAttribute('tabindex', '0');
    options.type && toast.setAttribute('data-type', options.type);
    invert && toast.setAttribute('data-invert', '');
    // signals that the content is being updated; it is gone on the replacing toast
    options.type === 'loading' && toast.setAttribute('aria-busy', 'true');

    // richColors
    if (richColors && options.type) {
        toast.setAttribute('data-rich-colors', '');
    }

    if (options.type) {
        const icon = document.createElement('span');
        // we already know our icons would be safe
        icon.innerHTML = __unsafeCreateTrustedHtml(icons[options.type]);
        icon.setAttribute('data-icon', '');
        // purely decorative: the severity is carried by the visually hidden label below
        icon.setAttribute('aria-hidden', 'true');
        toast.appendChild(icon);

        if (options.type === 'loading' && oldToast) {
            const currentTime = oldToast.querySelector('[data-icon] div')?.getAnimations()?.[0]?.currentTime;
            if (currentTime) {
                loadingCurrentTime = currentTime;
            }
        }
    }

    const content = document.createElement('div');
    content.setAttribute('data-content', '');
    toast.appendChild(content);

    // severity as text, since the icon and the colours convey it visually only
    if (options.type) {
        const typeLabel = document.createElement('span');
        typeLabel.setAttribute('data-type-label', '');
        typeLabel.setAttribute('data-sr-only', '');
        // the trailing colon gives screen readers a natural pause
        typeLabel.textContent = `${options.typeLabel ?? config.a11y.labels.types[options.type]}: `;
        content.appendChild(typeLabel);
    }

    const title = document.createElement('div');
    title.setAttribute('data-title', '');
    title.id = `sonner-title-${uid}`;
    toast.setAttribute('aria-labelledby', title.id);

    if (titleAsHtml) {
        // opt-in: the caller takes responsibility for sanitising `title`
        title.innerHTML = __unsafeCreateTrustedHtml(options.title);
    } else {
        title.textContent = options.title;
    }
    content.appendChild(title);

    if (options.description) {
        const desc = document.createElement('div');
        desc.textContent = options.description;
        desc.setAttribute('data-description', '');
        desc.id = `sonner-desc-${uid}`;
        toast.setAttribute('aria-describedby', desc.id);
        content.appendChild(desc);
    }

    /** Same path as the swipe gesture and the close button, user callbacks included. */
    const requestDismiss = () => {
        onDismiss();
        dismissToast(id, 200);
    };

    if (options.action) {
        // a real <button>: Enter and Space work natively, no role or tabindex needed
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('data-button', '');
        button.textContent = options.action.label;
        options.action.cancel && button.setAttribute('data-cancel', '');
        button.addEventListener('mousedown', e => e.stopPropagation());
        button.addEventListener('click', e => {
            options.action?.onClick(e);
            onDismiss();
            dismissToast(id);
        });
        toast.appendChild(button);
    }

    // add close button — last in the DOM so the tab order reads content, then action, then dismiss.
    // It is position: absolute with z-index: 1, so its place among the children is visually irrelevant.
    if (closeButton) {
        const close = document.createElement('button');
        close.type = 'button';
        close.setAttribute('data-close-button', 'true');
        close.setAttribute('aria-label', config.a11y.labels.close);
        // we already know our icon would be safe
        close.innerHTML = __unsafeCreateTrustedHtml(closeIcon);
        // otherwise dragging from the cross starts a swipe
        close.addEventListener('mousedown', e => e.stopPropagation());
        close.addEventListener('click', requestDismiss);
        toast.appendChild(close);
    }

    toast.addEventListener('transitionstart', () => toast.setAttribute('data-moving', 'true'));
    toast.addEventListener('transitionend', () => toast.setAttribute('data-moving', 'false'));

    // close toast — startTimer is a no-op for duration <= 0, and pausing is handled on the region
    startTimer(id, duration, () => {
        onAutoClose();
        dismissToast(id);
    });

    // registered even without a timer: the keyboard must be able to dismiss a persistent toast
    registerToastHandlers(toast, { id, requestDismiss });

    if (duration > 0) {
        // swipe toast to dismiss
        toast.addEventListener('mousedown', e => {
            if (toast.getAttribute('data-moving') == 'true') return;
            toast.setAttribute('data-swiping', 'true');

            const startX = e.clientX;
            const startY = e.clientY;

            let deltaX = 0;
            let deltaY = 0;
            let directionLocked: 'x' | 'y' | null = null;

            const [positionY, positionX] = position.split('-');
            const liftX = positionX === 'right' ? 1 : -1;
            const liftY = positionY === 'bottom' ? 1 : -1;

            if (positionX === 'center') directionLocked = 'y';

            const onMouseMove = (e: MouseEvent) => {
                deltaX = e.clientX - startX;
                deltaY = e.clientY - startY;

                if (Math.max(deltaX, deltaY) > 10) {
                    directionLocked ??= Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
                }

                if (directionLocked === 'x') {
                    const resistanceCoefficient = deltaX * liftX < 0 ? 0.02 : 1;
                    deltaX *= resistanceCoefficient;
                    toast.style.setProperty('--swipe-amount-x', `${deltaX}px`);
                    toast.style.setProperty('--swipe-amount-y', `0`);
                } else if (directionLocked === 'y') {
                    const resistanceCoefficient = deltaY * liftY < 0 ? 0.02 : 1;
                    deltaY *= resistanceCoefficient;
                    toast.style.setProperty('--swipe-amount-y', `${deltaY}px`);
                    toast.style.setProperty('--swipe-amount-x', `0`);
                }
            };

            const onMouseUp = () => {
                if (directionLocked === 'x' && Math.abs(deltaX) > 30) {
                    toast.style.setProperty('--swipe-amount-x', `${liftX * 300}%`);
                    onDismiss();
                    dismissToast(id, 200);
                } else if (directionLocked === 'y' && Math.abs(deltaY) > 10) {
                    toast.style.setProperty('--swipe-amount-y', `${liftY * 300}%`);
                    onDismiss();
                    dismissToast(id, 200);
                } else {
                    toast.setAttribute('data-swiping', 'false');
                    toast.style.setProperty('--swipe-amount-x', '0');
                    toast.style.setProperty('--swipe-amount-y', '0');
                }

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    if (oldToast) {
        // a focused loading toast whose promise resolves would otherwise lose focus to <body>
        const shadow = oldToast.getRootNode() as ShadowRoot;
        const active = shadow.activeElement;
        const hadFocus = !!active && (active === oldToast || oldToast.contains(active));

        toast.setAttribute('style', oldToast.getAttribute('style') || '');
        toaster.replaceChild(toast, oldToast);
        toastMap.set(id, toast);

        if (hadFocus) toast.focus({ preventScroll: true });

        if (loadingCurrentTime) {
            const animation = toast.querySelector('[data-icon] div')?.getAnimations()?.[0];
            if (animation) {
                animation.currentTime = loadingCurrentTime;
            }
        }
    } else {
        toast.setAttribute('data-state', 'created');
        toaster.appendChild(toast);
        // Measured here, while the toast is still :last-child and its height is therefore not yet
        // constrained by the collapsed-stack rules. assignOffset only ever measures the front toast,
        // so a batch of toasts created in one task would leave every toast but the last without an
        // --init-height, and the offsets computed from it would come out as NaN.
        toast.style.setProperty('--init-height', `${toast.offsetHeight}px`);
        toastMap.set(id, toast);
    }

    // announced after insertion, and through a channel decoupled from the toast DOM — which is why
    // a replaced toast (toast.promise) re-announces without any special casing
    announce(buildAnnounceText(content, options.action?.label), resolvePoliteness(options.type, important));

    return id;
}

/**
 * Read back from the already built nodes rather than from the raw options, so nothing is parsed twice.
 * The parts are joined explicitly: `content.textContent` would run the title straight into the
 * description, which a screen reader then reads as a single run-on word.
 */
function buildAnnounceText(content: HTMLElement, actionLabel?: string): string {
    const parts: string[] = [];
    // trailing punctuation is dropped so the join below does not produce a doubled full stop
    const push = (text: string) => {
        const trimmed = text.trim().replace(/[.:]+$/, '');
        if (trimmed) parts.push(trimmed);
    };

    push(content.querySelector('[data-type-label]')?.textContent ?? '');
    push(content.querySelector('[data-title]')?.textContent ?? '');
    push(content.querySelector('[data-description]')?.textContent ?? '');
    // the user needs to know an action is on offer
    if (actionLabel) parts.push(`${config.a11y.labels.action}: ${actionLabel}`);

    return parts.join('. ');
}

export function dismissToast(id?: ToastType['id'], exitTime: number = 400) {
    if (toastMap.size === 0) return;

    if (id === undefined) {
        toastMap.forEach((_, index) => dismissToast(index));
        restoreFocus();
        return;
    }

    const toast = toastMap.get(id);
    if (!toast) return;

    // clears the pending timeout, which would otherwise fire for a recycled id
    clearTimer(id);

    toast.setAttribute('data-state', 'deleting');
    const parent = toast.parentElement as HTMLElement;
    // before assignOffset: the toast lingers for the exit animation and must leave the a11y tree now
    handleToastRemoved(toast, toast.getRootNode() as ShadowRoot);
    assignOffset(parent);
    setTimeout(() => requestAnimationFrame(() => toast.remove()), exitTime);
    toastMap.delete(id);
}
