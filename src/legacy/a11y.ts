/**
 * Accessibility layer (Phase 4). Adds semantics, focus management and keyboard support the
 * design lacks, WITHOUT changing anything visible: it only sets attributes, moves focus and
 * handles keys. Every element it changes gets `data-kf-a11y`, so the parity comparison can
 * tell these deliberate additions apart from drift.
 *
 * Runs after every render (idempotent and cheap).
 */

const MARK = "data-kf-a11y";
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function set(el: Element, name: string, value: string) {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  if (!el.hasAttribute(MARK)) el.setAttribute(MARK, "");
}

export interface A11yLabels {
  payTitle: string;
}

/** Static semantics for the current DOM. */
export function enhance(root: Element, labels: A11yLabels) {
  // Skip-link target.
  const main = root.querySelector(":scope > div > main");
  if (main) {
    set(main, "id", "kf-main");
    set(main, "tabindex", "-1");
  }
  // Dialogs: the design marks them role="dialog"; make them modal.
  for (const d of root.querySelectorAll("[data-drawer], [data-nav-drawer], [data-conf]")) {
    set(d, "aria-modal", "true");
    set(d, "tabindex", "-1");
  }
  // Payment options: role="radio" buttons in a plain div → a labelled radio group.
  const radio = root.querySelector('[data-drawer] button[role="radio"]');
  if (radio?.parentElement) {
    set(radio.parentElement, "role", "radiogroup");
    set(radio.parentElement, "aria-label", labels.payTitle);
    const radios = [...radio.parentElement.querySelectorAll('button[role="radio"]')];
    radios.forEach((r) => set(r, "tabindex", r.getAttribute("aria-checked") === "true" ? "0" : "-1"));
  }
  // Checkout fields: link each error message to its input.
  root.querySelectorAll("[data-drawer] label").forEach((label, i) => {
    const input = label.querySelector("input");
    if (!input) return;
    const err = label.querySelector(":scope > span:last-child:not(:first-child)");
    const hasErr = !!err && err !== label.firstElementChild && err.textContent !== "";
    set(input, "aria-invalid", String(hasErr));
    if (hasErr) {
      set(err!, "id", `kf-err-${i}`);
      set(input, "aria-describedby", `kf-err-${i}`);
    } else if (input.hasAttribute("aria-describedby")) input.removeAttribute("aria-describedby");
  });
  // Product photos are CSS backgrounds: give them the dish name.
  for (const card of root.querySelectorAll("article")) {
    const name = card.querySelector("h3")?.textContent?.trim();
    const photo = card.firstElementChild;
    if (!name || !photo || photo.tagName !== "DIV" || !(photo as HTMLElement).style.backgroundImage.includes("url("))
      continue;
    set(photo, "role", "img");
    set(photo, "aria-label", name);
  }
  // Gallery items: reachable and operable from the keyboard (Enter/Space centres the item).
  for (const item of root.querySelectorAll(".kf-gallery-item")) {
    const name = item.querySelector(".kf-gallery-name")?.textContent?.trim() ?? "";
    set(item, "tabindex", "0");
    set(item, "role", "button");
    set(item, "aria-label", name);
  }
}

/** Keyboard behaviour that complements the design's own handlers. */
export function handleKey(e: KeyboardEvent, closeTopDialog: () => boolean) {
  if (e.key === "Escape") {
    if (closeTopDialog()) e.preventDefault();
    return;
  }
  const target = e.target as HTMLElement | null;
  if (!target) return;
  // Tab stays inside an open dialog.
  if (e.key === "Tab") {
    const dialog = topDialog();
    if (!dialog) return;
    const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      first.focus();
      e.preventDefault();
    }
    return;
  }
  // Arrow keys move between payment options.
  if (target.getAttribute("role") === "radio" && /^Arrow(Up|Down|Left|Right)$/.test(e.key)) {
    const radios = [...(target.parentElement?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])];
    const i = radios.indexOf(target);
    const next =
      radios[(i + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : radios.length - 1)) % radios.length];
    next.click();
    next.focus();
    e.preventDefault();
    return;
  }
  // Enter/Space on a gallery item centres it, like a click.
  if (target.classList.contains("kf-gallery-item") && (e.key === "Enter" || e.key === " ")) {
    target.click();
    e.preventDefault();
  }
}

/** The dialog in front: confirmation, then cart drawer, then nav drawer. */
export function topDialog(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>("[data-conf]") ??
    document.querySelector<HTMLElement>("[data-drawer]") ??
    document.querySelector<HTMLElement>("[data-nav-drawer]")
  );
}

/**
 * Called when a dialog opens or closes. On open: remember the opener, make the rest of the
 * page inert, move focus into the dialog. On close: restore everything and the focus.
 */
export class DialogFocus {
  private opener: HTMLElement | null = null;
  private inerted: Element[] = [];

  update(root: Element) {
    const dialog = topDialog();
    if (dialog && !this.inerted.length) {
      this.opener = document.activeElement as HTMLElement | null;
      const page = root.querySelector(":scope > div");
      // Everything except the dialog and its overlay (the preceding sibling) becomes inert.
      for (const el of page?.children ?? []) {
        if (el === dialog || el.nextElementSibling === dialog || el.contains(dialog)) continue;
        el.setAttribute("inert", "");
        this.inerted.push(el);
      }
      requestAnimationFrame(() => {
        const first = dialog.querySelector<HTMLElement>(FOCUSABLE);
        (first ?? dialog).focus({ preventScroll: true });
      });
    } else if (dialog && this.inerted.length) {
      // A different dialog may have replaced the previous one (e.g. drawer → confirmation).
      if (!dialog.contains(document.activeElement)) {
        dialog.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
      }
    } else if (!dialog && this.inerted.length) {
      for (const el of this.inerted) el.removeAttribute("inert");
      this.inerted = [];
      if (this.opener?.isConnected) this.opener.focus({ preventScroll: true });
      this.opener = null;
    }
  }
}
