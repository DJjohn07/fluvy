import { serialize, type DemoState, type DemoView } from './state.js';

/**
 * How the demo's parts open a page: every entry, card and button is a real link (a new tab, a copied address, a reader's
 * list of links all work), and its plain click opens the page in place, sent up as `demo-go` for the page to push onto
 * the history.
 */
export const GO = 'demo-go';

/** The link to a page in the look the visitor wears now: a query alone, read against the demo's own address. */
export const hrefOf = (state: DemoState, view: DemoView): string =>
  `?${serialize({ ...state, view }).toString()}`;

/** Asks the page to open `view`. */
export function go(from: EventTarget, view: DemoView): void {
  from.dispatchEvent(
    new CustomEvent<DemoView>(GO, { detail: view, bubbles: true, composed: true }),
  );
}

/** A link's plain click opens its page in place; one with a modifier (a new tab, a new window) is the browser's. */
export function follow(event: MouseEvent, view: DemoView): void {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  event.preventDefault();
  go(event.currentTarget ?? document, view);
}

/** The repository, and where its README says how to install. */
export const REPO = 'https://github.com/acosta290/fluvy';
export const INSTALL = `${REPO}#installation`;
