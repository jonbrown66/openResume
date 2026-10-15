import { useEffect, useRef, type RefObject } from 'react';

const focusable = 'button:not([disabled]),a[href],input:not([type=hidden]):not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]';

/** One keyboard/focus contract for dialogs; portaled Selects remain a separate branch. */
export function useOverlayDialog(open: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void, modal = false, returnFocus?: RefObject<HTMLElement | null>) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const panel = ref.current;
    if (!open || !panel) return;
    const previous = returnFocus?.current ?? document.activeElement as HTMLElement | null;
    panel.focus({ preventScroll: true });
    const background = modal ? Array.from(document.body.children).filter(element => !element.contains(panel) && !element.matches('[data-overlay-branch]')) as HTMLElement[] : [];
    const before = background.map(element => element.inert);
    background.forEach(element => { element.inert = true; });
    const keyboard = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (event.target as Element)?.closest('[data-slot="select-content"],[data-overlay-branch]')) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current(); return; }
      if (!modal || event.key !== 'Tab') return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(focusable)).filter(element => element.getClientRects().length && !element.closest('[inert]'));
      if (!items.length) { event.preventDefault(); panel.focus(); return; }
      const current = document.activeElement;
      if (event.shiftKey && (current === items[0] || current === panel || !panel.contains(current))) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && (current === items.at(-1) || !panel.contains(current))) { event.preventDefault(); items[0]?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('keydown', keyboard);
      background.forEach((element, index) => { element.inert = before[index]; });
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus({ preventScroll: true });
    };
  }, [open, ref, modal, returnFocus]);
}
