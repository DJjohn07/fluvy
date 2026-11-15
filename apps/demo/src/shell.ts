import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import type { PaletteName } from '@fluvy/tokens/runtime';
import { isLanguageCode, offeredLanguages } from '@fluvy/core';
import { baseStyles, fitPills, glyph, reducedMotion, sideScroll, type GlyphName } from '@fluvy/ui';
import '@fluvy/ui/select';
import type { SelectChangeDetail, SelectOption } from '@fluvy/ui/select';
import { CARDS, cardOf, searchCards, wordsOf, type DemoCard } from './catalog.js';
import { CARD_GROUPS, FAMILIES, familyOf, groupOf } from './families.js';
import { follow, hrefOf, INSTALL, REPO } from './nav.js';
import type { DemoState, DemoView } from './state.js';
import { t, type StringKey } from './strings.js';

/** A preset on the palette row: its accent as the dot's colour. */
export interface PaletteDot {
  readonly name: PaletteName;
  readonly title: string;
  readonly ink: string;
}

/** The languages as the settings panel offers them: each by its own name, its English one beside it. */
const LANGUAGE_OPTIONS: readonly SelectOption[] = offeredLanguages().map((language) => ({
  value: language.code,
  label: language.name,
  ...(language.english !== language.name ? { hint: language.english } : {}),
}));

/** The most results the search lists. */
const RESULTS = 8;
/** How long the drawer takes to leave. */
const LEAVE_MS = 200;

/** The pages of the menu's last part, in its order. */
const PAGES: readonly {
  readonly view: DemoView;
  readonly label: StringKey;
  readonly glyph: GlyphName;
}[] = [
  { view: { kind: 'auto', view: 'home' }, label: 'page.auto', glyph: 'sparkle' },
  { view: { kind: 'panel', tab: 'appearance' }, label: 'page.panel', glyph: 'gear' },
  { view: { kind: 'activity' }, label: 'page.activity', glyph: 'list' },
  { view: { kind: 'history' }, label: 'page.history', glyph: 'chart' },
];

/**
 * The demo's chrome, drawn with the design system's own parts: a top bar (the brand, a search that finds a card by its
 * name or its line, the palette, light and dark, the language, the repository and how to install) and the menu, a rail
 * beside the page on a desktop and a drawer from the menu button on a phone or a tablet: the overview, the cards in the
 * README's groups, the showcase of the design sheets, the automatic dashboard and the pages, and the themes. The page
 * stands in its slot. A page is opened as `demo-go` (every entry is a link too), a look changed as `demo-change`; the
 * page answers by setting `state` again.
 */
export class FluvyDemoShell extends LitElement {
  static override styles = [
    ...baseStyles,
    css`
      :host {
        display: block;
        min-height: 100vh;
        color: var(--fluvy-text);
        font-family: Inter, system-ui, sans-serif;
        --dm-bar: 64px;
        --dm-rail: 288px;
      }
      a {
        color: inherit;
        text-decoration: none;
      }
      .dm-skip {
        position: fixed;
        top: 8px;
        left: 16px;
        z-index: 5;
        transform: translateY(-120%);
      }
      .dm-skip:focus-visible {
        transform: none;
      }

      /* ---------- the top bar ---------- */
      .dm-top {
        position: sticky;
        top: 0;
        z-index: 3;
        display: flex;
        align-items: center;
        gap: 8px;
        height: var(--dm-bar);
        padding: 0 16px;
        box-sizing: border-box;
        background: color-mix(in srgb, var(--fluvy-page) 88%, transparent);
        box-shadow: 0 1px 0 var(--fluvy-border);
        -webkit-backdrop-filter: blur(16px);
        backdrop-filter: blur(16px);
      }
      .dm-brand {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 12px;
        height: 44px;
        padding-right: 8px;
        border-radius: var(--fluvy-radius-control);
      }
      .dm-brand img {
        width: 36px;
        height: 36px;
        border-radius: 10px;
      }
      .dm-brand__text {
        display: flex;
        flex-direction: column;
      }
      .dm-brand__name {
        font-size: 17px;
        font-weight: 600;
        line-height: 20px;
        letter-spacing: -0.01em;
      }
      .dm-brand__sub {
        font-size: 12px;
        font-weight: 500;
        line-height: 16px;
        color: var(--fluvy-text-secondary);
        white-space: nowrap;
      }
      .dm-end {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 8px;
        margin-left: auto;
      }
      .dm-language {
        width: 176px;
      }
      /* the search starts where the page's own words do, past the rail */
      .dm-top > .dm-brand {
        width: var(--dm-rail);
        box-sizing: border-box;
      }
      .dm-menu-button,
      .dm-search-button {
        display: none;
      }

      /* ---------- the search ---------- */
      .dm-search {
        position: relative;
        flex: 0 1 400px;
        min-width: 0;
      }
      .dm-search .fv-field__input {
        appearance: none;
      }
      .dm-results {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        z-index: 4;
        box-sizing: border-box;
        min-width: 320px;
        max-height: min(560px, calc(100vh - var(--dm-bar) - 16px));
        padding: 4px;
        overflow-y: auto;
        scrollbar-width: none;
        border-radius: var(--fluvy-radius-lg);
        background: var(--fluvy-card);
        box-shadow:
          0 0 0 1px var(--fluvy-edge, var(--fluvy-border)),
          var(--fluvy-shadow-lift);
        animation: fv-menu-in 200ms var(--fv-ease-out, ease-out) both;
        --fv-menu-from: -4px;
      }
      .dm-results--inline {
        position: static;
        min-width: 0;
        max-height: none;
        padding: 0;
        background: none;
        box-shadow: none;
        animation: none;
      }
      .dm-result {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 10px 12px;
        border-radius: 12px;
        cursor: pointer;
      }
      .dm-result[aria-selected='true'] {
        background: var(--fluvy-inset, var(--fluvy-page));
      }
      .dm-results--inline .dm-result[aria-selected='true'] {
        background: var(--fluvy-card);
      }
      .dm-result__head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
      }
      .dm-result__name {
        font-size: 15px;
        font-weight: 600;
        line-height: 20px;
      }
      .dm-result__group {
        flex: 0 0 auto;
        font-size: 12px;
        font-weight: 500;
        line-height: 16px;
        color: var(--fluvy-text-secondary);
      }
      .dm-result__line,
      .dm-none {
        font-size: 13px;
        font-weight: 500;
        line-height: 18px;
        color: var(--fluvy-text-secondary);
      }
      .dm-none {
        margin: 0;
        padding: 12px;
      }

      /* ---------- the palette's dots ---------- */
      .dm-palette-button {
        position: relative;
      }
      .dm-swatch {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--fluvy-accent);
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--fluvy-text) 14%, transparent);
      }
      .dm-pop {
        position: absolute;
        top: calc(var(--dm-bar) - 8px);
        right: 16px;
        z-index: 4;
        width: 264px;
        box-sizing: border-box;
        padding: 12px;
        border-radius: var(--fluvy-radius-lg);
        background: var(--fluvy-card);
        box-shadow:
          0 0 0 1px var(--fluvy-edge, var(--fluvy-border)),
          var(--fluvy-shadow-lift);
        animation: fv-menu-in 200ms var(--fv-ease-out, ease-out) both;
        --fv-menu-from: -4px;
      }
      .dm-pop__head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        padding: 0 4px 8px;
      }
      .dm-pop__title {
        font-size: 13px;
        font-weight: 600;
        line-height: 16px;
      }
      .dm-pop__name {
        font-size: 13px;
        font-weight: 500;
        line-height: 16px;
        color: var(--fluvy-text-secondary);
      }
      .dm-dots {
        display: grid;
        grid-template-columns: repeat(5, 44px);
        justify-content: space-between;
      }
      .dm-dots--row {
        display: flex;
        width: max-content;
      }
      .dm-dot {
        position: relative;
        flex: 0 0 auto;
        width: 44px;
        height: 44px;
        padding: 0;
        border: 0;
        background: none;
        cursor: pointer;
        color: var(--fluvy-text-secondary);
      }
      .dm-dot::before {
        content: '';
        position: absolute;
        top: 10px;
        left: 10px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--dot, var(--fluvy-card));
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--fluvy-text) 14%, transparent);
        transition: transform 180ms var(--fv-ease, ease);
      }
      .dm-dot.is-active::before {
        box-shadow:
          0 0 0 2px var(--fluvy-card),
          0 0 0 4px var(--dot, var(--fluvy-accent));
      }
      .dm-drawer .dm-dot.is-active::before {
        box-shadow:
          0 0 0 2px var(--fluvy-page),
          0 0 0 4px var(--dot, var(--fluvy-accent));
      }
      .dm-dot:focus-visible {
        outline: none;
      }
      .dm-dot:focus-visible::before {
        box-shadow:
          0 0 0 2px var(--fluvy-card),
          0 0 0 4px var(--fluvy-accent);
      }
      @media (hover: hover) {
        .dm-dot:hover::before {
          transform: scale(1.12);
        }
      }
      .dm-dot--custom svg {
        position: absolute;
        top: 14px;
        left: 14px;
        width: 16px;
        height: 16px;
      }

      /* ---------- the body: the rail beside the page ---------- */
      .dm-body {
        display: grid;
        grid-template-columns: var(--dm-rail) minmax(0, 1fr);
      }
      .dm-rail {
        position: sticky;
        top: var(--dm-bar);
        height: calc(100vh - var(--dm-bar));
        box-sizing: border-box;
        padding: 16px 12px 32px 16px;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: none;
        box-shadow: inset -1px 0 0 var(--fluvy-border);
      }
      .dm-rail::-webkit-scrollbar {
        display: none;
      }
      .dm-main {
        min-width: 0;
      }

      /* ---------- the menu ---------- */
      .dm-nav {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .dm-label {
        margin: 16px 0 4px;
        padding: 0 12px;
        font-size: 11px;
        font-weight: 600;
        line-height: 16px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--fluvy-text-secondary);
      }
      .dm-item {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        min-height: 44px;
        box-sizing: border-box;
        padding: 0 12px;
        border: 0;
        border-radius: var(--fluvy-radius-control);
        background: none;
        color: var(--fluvy-text);
        font: inherit;
        font-size: 15px;
        font-weight: 500;
        line-height: 20px;
        text-align: left;
        cursor: pointer;
      }
      .dm-item > svg {
        flex: 0 0 20px;
        width: 20px;
        height: 20px;
        color: var(--fluvy-text-secondary);
      }
      .dm-item__label {
        flex: 1 1 auto;
        min-width: 0;
        padding: 12px 0;
      }
      .dm-item--card {
        padding-left: 44px;
        font-size: 14px;
        color: var(--fluvy-text-secondary);
      }
      .dm-item__chevron {
        display: inline-flex;
        flex: 0 0 20px;
        color: var(--fluvy-text-secondary);
        transition: transform 180ms var(--fv-ease, ease);
      }
      .dm-item__chevron svg {
        width: 20px;
        height: 20px;
      }
      .dm-item[aria-expanded='true'] .dm-item__chevron {
        transform: rotate(90deg);
      }
      @media (hover: hover) {
        .dm-item:hover {
          background: var(--fluvy-card);
        }
      }
      .dm-item.is-active,
      .dm-item.is-active:hover {
        background: var(--fluvy-accent-fill);
        color: var(--fluvy-accent-on-fill);
      }
      .dm-item.is-active > svg {
        color: inherit;
      }
      .dm-sub {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      /* ---------- the drawer ---------- */
      .dm-drawer {
        position: fixed;
        inset: 0 auto 0 0;
        width: min(336px, calc(100vw - 48px));
        height: 100%;
        max-width: none;
        max-height: none;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        border: 0;
        background: var(--fluvy-page);
        color: inherit;
        box-shadow:
          1px 0 0 var(--fluvy-edge, var(--fluvy-border)),
          24px 0 64px -24px rgb(0 0 0 / calc(0.4 * var(--fluvy-shade, 1)));
        overflow: hidden;
        animation: dm-in 280ms var(--fv-ease-out, ease-out) both;
      }
      .dm-drawer[open] {
        display: flex;
        flex-direction: column;
      }
      .dm-drawer::backdrop {
        background: color-mix(in srgb, var(--fluvy-neutral-05, #000) 48%, transparent);
        animation: fv-fade 240ms var(--fv-ease, ease) both;
      }
      .dm-drawer.is-leaving {
        animation: dm-out 200ms var(--fv-ease, ease) both;
      }
      @keyframes dm-in {
        from {
          transform: translateX(-100%);
        }
      }
      @keyframes dm-out {
        to {
          transform: translateX(-100%);
        }
      }
      .dm-drawer__head {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 8px;
        height: var(--dm-bar);
        padding: 0 16px;
        box-sizing: border-box;
      }
      .dm-drawer__head .dm-brand {
        margin-right: auto;
      }
      .dm-drawer__search {
        flex: 0 0 auto;
        padding: 0 16px 8px;
      }
      .dm-drawer__body {
        flex: 1 1 auto;
        min-height: 0;
        padding: 0 16px 16px;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: none;
      }
      .dm-drawer__foot {
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px 16px calc(16px + env(safe-area-inset-bottom, 0px));
        box-shadow: 0 -1px 0 var(--fluvy-border);
      }
      .dm-drawer__row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .dm-drawer__row > fluvy-select {
        flex: 1 1 0;
        min-width: 0;
      }
      .dm-scroll {
        margin: 0 -16px;
        padding: 0 6px;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .dm-scroll::-webkit-scrollbar {
        display: none;
      }
      .dm-links {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      .dm-links > a {
        gap: 8px;
      }
      .dm-links svg,
      .dm-install svg {
        width: 20px;
        height: 20px;
      }

      /* ---------- the notice ---------- */
      .dm-toast {
        position: fixed;
        left: 50%;
        bottom: 24px;
        z-index: 6;
        max-width: calc(100vw - 32px);
        box-sizing: border-box;
        padding: 12px 16px;
        border-radius: var(--fluvy-radius-control);
        background: var(--fluvy-card);
        color: var(--fluvy-text);
        box-shadow:
          0 0 0 1px var(--fluvy-border),
          var(--fluvy-shadow-lift, 0 8px 24px rgba(0, 0, 0, 0.12));
        font-size: 14px;
        line-height: 20px;
        transform: translateX(-50%);
        animation: dm-toast 240ms var(--fv-ease-out, ease-out) both;
      }
      @keyframes dm-toast {
        from {
          opacity: 0;
          transform: translate(-50%, 8px);
        }
      }

      /* a tablet: the menu in a drawer, the search beside the brand, the language and the links in the drawer */
      @media (max-width: 1023px) {
        .dm-body {
          grid-template-columns: minmax(0, 1fr);
        }
        .dm-rail,
        .dm-end > .dm-wide {
          display: none;
        }
        .dm-top > .dm-brand {
          width: auto;
        }
        .dm-menu-button {
          display: inline-flex;
        }
        .dm-top > .dm-search {
          flex: 1 1 400px;
          margin-left: 8px;
        }
      }
      /* a phone: the bar holds the menu, the brand, the search's round and light or dark; the rest is in the drawer */
      @media (max-width: 719px) {
        :host {
          --dm-bar: 60px;
        }
        .dm-top {
          gap: 4px;
          padding: 0 8px;
        }
        .dm-top > .dm-search,
        .dm-palette-button,
        .dm-top .dm-brand__sub {
          display: none;
        }
        .dm-search-button {
          display: inline-flex;
        }
        .dm-brand {
          gap: 10px;
        }
        .dm-brand img {
          width: 32px;
          height: 32px;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .dm-toast,
        .dm-drawer,
        .dm-drawer::backdrop,
        .dm-results,
        .dm-pop {
          animation: none;
        }
        .dm-dot::before,
        .dm-item__chevron {
          transition: none;
        }
      }
    `,
  ];

  static override properties = {
    state: { attribute: false },
    palettes: { attribute: false },
    mark: { attribute: false },
    notice: { state: true },
    drawer: { state: true },
    leaving: { state: true },
    query: { state: true },
    active: { state: true },
    searching: { state: true },
    paletteOpen: { state: true },
    folded: { state: true },
  };

  declare state: DemoState | undefined;
  declare palettes: readonly PaletteDot[];
  /** The brand mark's URL. */
  declare mark: string;
  declare notice: string;
  /** The drawer is open. */
  declare drawer: boolean;
  declare leaving: boolean;
  /** What is typed in the search, and the result the keys are on. */
  declare query: string;
  declare active: number;
  /** The top bar's search has the focus: its results show under it. */
  declare searching: boolean;
  declare paletteOpen: boolean;
  /** The menu's groups the visitor opened or closed, over the rule (the shown card's group open, the rest closed). */
  declare folded: ReadonlyMap<string, boolean>;
  private timer = 0;
  private leaveTimer = 0;
  private refit: (() => void) | undefined;
  /** Where the focus goes back to when the drawer closes. */
  private opener: HTMLElement | undefined;
  /** The search's field to focus once the drawer is open. */
  private focusSearch = false;

  constructor() {
    super();
    this.palettes = [];
    this.mark = '';
    this.notice = '';
    this.drawer = false;
    this.leaving = false;
    this.query = '';
    this.active = 0;
    this.searching = false;
    this.paletteOpen = false;
    this.folded = new Map();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('pointerdown', this.outside);
    document.addEventListener('keydown', this.escape);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('pointerdown', this.outside);
    document.removeEventListener('keydown', this.escape);
  }

  /** A press outside the palette's dots closes them. */
  private readonly outside = (event: PointerEvent): void => {
    if (!this.paletteOpen) return;
    const path = event.composedPath();
    const pop = this.renderRoot.querySelector('.dm-pop');
    const button = this.renderRoot.querySelector('.dm-palette-button');
    if (!path.some((node) => node === pop || node === button)) this.paletteOpen = false;
  };

  /** Escape closes the palette's dots, giving the focus back to their button. */
  private readonly escape = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.paletteOpen) return;
    this.paletteOpen = false;
    this.renderRoot.querySelector<HTMLElement>('.dm-palette-button')?.focus();
  };

  /** A word for the visitor, gone by itself. */
  say(text: string): void {
    this.notice = text;
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => (this.notice = ''), 2800);
  }

  private change(patch: Partial<DemoState>): void {
    this.dispatchEvent(
      new CustomEvent('demo-change', { detail: patch, bubbles: true, composed: true }),
    );
  }

  /** The pills sized from their text on the 4 px grid, as every card does (again once the web font is in). */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    fitPills(this.renderRoot);
    if (!this.refit) {
      this.refit = () => fitPills(this.renderRoot, true);
      void document.fonts.ready.then(this.refit);
    }
    const dialog = this.renderRoot.querySelector<HTMLDialogElement>('.dm-drawer');
    if (dialog && this.drawer && !dialog.open) {
      dialog.showModal();
      const row = dialog.querySelector<HTMLElement>('.dm-scroll');
      if (row) sideScroll(row);
      const target = this.focusSearch
        ? dialog.querySelector<HTMLElement>('.fv-field__input')
        : dialog.querySelector<HTMLElement>('.dm-close');
      this.focusSearch = false;
      target?.focus();
      dialog.querySelector<HTMLElement>('.dm-item.is-active')?.scrollIntoView({ block: 'center' });
    }
    // the rail shows the page's own entry: where it is out of sight the rail scrolls itself to it, never the page
    if (changed.has('state')) {
      const rail = this.renderRoot.querySelector<HTMLElement>('.dm-rail');
      const item = rail?.querySelector<HTMLElement>('.dm-item.is-active');
      if (rail && item && rail.clientHeight > 0) {
        const top = item.offsetTop - rail.offsetTop;
        if (top < rail.scrollTop || top + item.offsetHeight > rail.scrollTop + rail.clientHeight)
          rail.scrollTo({
            top: top - rail.clientHeight / 2,
            behavior: changed.get('state') && !reducedMotion() ? 'smooth' : 'instant',
          });
      }
    }
  }

  /* ---------- the drawer ---------- */

  private openDrawer(event: Event, search = false): void {
    clearTimeout(this.leaveTimer);
    this.opener = event.currentTarget as HTMLElement;
    this.focusSearch = search;
    this.leaving = false;
    this.drawer = true;
  }

  /** Closes the drawer, gliding out; `now` at once (a page opened from it). */
  private closeDrawer(now = false): void {
    if (!this.drawer) return;
    const finish = (): void => {
      clearTimeout(this.leaveTimer);
      this.leaving = false;
      this.drawer = false;
      this.renderRoot.querySelector<HTMLDialogElement>('.dm-drawer')?.close();
      if (this.opener?.isConnected) this.opener.focus();
      this.opener = undefined;
    };
    if (now || reducedMotion()) {
      finish();
      return;
    }
    this.leaving = true;
    this.leaveTimer = window.setTimeout(finish, LEAVE_MS);
  }

  /** A page opened from the menu: the drawer closes behind it, the search is emptied. */
  private open(event: MouseEvent, view: DemoView): void {
    follow(event, view);
    if (!event.defaultPrevented) return;
    this.query = '';
    this.searching = false;
    this.closeDrawer(true);
  }

  /* ---------- the search ---------- */

  private results(): DemoCard[] {
    return searchCards(this.query, CARDS, wordsOf).slice(0, RESULTS);
  }

  private onInput(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
    this.active = 0;
    // typed again after a card was opened from it, the field still has the focus: its results show again
    this.searching = true;
  }

  private onSearchKey(event: KeyboardEvent): void {
    const found = this.results();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!found.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.active = Math.min(Math.max(this.active + step, 0), found.length - 1);
      return;
    }
    if (event.key === 'Enter') {
      const card = found[this.active] ?? found[0];
      if (!card || !this.state) return;
      event.preventDefault();
      this.query = '';
      this.searching = false;
      this.closeDrawer(true);
      this.dispatchEvent(
        new CustomEvent<DemoView>('demo-go', {
          detail: { kind: 'card', card: card.short },
          bubbles: true,
          composed: true,
        }),
      );
      return;
    }
    if (event.key === 'Escape' && this.query) {
      // the first Escape empties the field; a second is the drawer's (it closes)
      event.preventDefault();
      event.stopPropagation();
      this.query = '';
    }
  }

  private clearSearch(event: Event): void {
    this.query = '';
    (
      (event.currentTarget as HTMLElement).parentElement?.querySelector(
        'input',
      ) as HTMLElement | null
    )?.focus();
  }

  private renderSearch(inline: boolean): TemplateResult {
    const state = this.state as DemoState;
    const lang = state.language;
    const found = this.query ? this.results() : [];
    const listed = this.query !== '' && (inline || this.searching);
    const id = inline ? 'dm-found-drawer' : 'dm-found';
    return html`<div class="dm-search">
      <label class="fv-field fv-field--on-page">
        ${glyph('search')}
        <input
          class="fv-field__input"
          type="search"
          role="combobox"
          autocomplete="off"
          spellcheck="false"
          aria-autocomplete="list"
          aria-expanded=${listed ? 'true' : 'false'}
          aria-controls=${id}
          aria-activedescendant=${listed && found.length ? `${id}-${this.active}` : nothing}
          aria-label=${t(lang, 'search.label')}
          placeholder=${t(lang, 'search.placeholder')}
          .value=${this.query}
          @input=${this.onInput}
          @keydown=${this.onSearchKey}
          @focus=${() => (this.searching = true)}
          @blur=${() => (this.searching = false)}
        />
        ${
          this.query
            ? html`<button
                class="fv-round fv-round--bare"
                data-target
                aria-label=${t(lang, 'search.clear')}
                title=${t(lang, 'search.clear')}
                @click=${this.clearSearch}
              >
                ${glyph('close')}
              </button>`
            : nothing
        }
      </label>
      ${
        listed
          ? html`<div
              class="dm-results ${inline ? 'dm-results--inline' : ''}"
              id=${id}
              role="listbox"
              aria-label=${t(lang, 'search.label')}
              @pointerdown=${(event: Event) => event.preventDefault()}
            >
              ${
                found.length
                  ? found.map((card, index) => {
                      const words = wordsOf(card);
                      const group = groupOf(card.short);
                      const view: DemoView = { kind: 'card', card: card.short };
                      return html`<a
                        class="dm-result"
                        id=${`${id}-${index}`}
                        role="option"
                        aria-selected=${index === this.active ? 'true' : 'false'}
                        href=${hrefOf(state, view)}
                        @pointerenter=${() => (this.active = index)}
                        @click=${(event: MouseEvent) => this.open(event, view)}
                      >
                        <span class="dm-result__head">
                          <span class="dm-result__name">${words.name}</span>
                          ${group ? html`<span class="dm-result__group">${t(lang, group.label)}</span>` : nothing}
                        </span>
                        ${words.description ? html`<span class="dm-result__line">${words.description}</span>` : nothing}
                      </a>`;
                    })
                  : html`<p class="dm-none" role="status">${t(lang, 'search.none')}</p>`
              }
            </div>`
          : nothing
      }
    </div>`;
  }

  /* ---------- the menu ---------- */

  /** Whether a group of the menu is open: as the visitor left it, else open where it holds the page shown. */
  private isOpen(key: string, holdsShown: boolean): boolean {
    return this.folded.get(key) ?? holdsShown;
  }

  private toggle(key: string, holdsShown: boolean): void {
    const next = new Map(this.folded);
    next.set(key, !this.isOpen(key, holdsShown));
    this.folded = next;
  }

  private item(
    view: DemoView,
    label: string,
    icon: GlyphName | undefined,
    active: boolean,
    extra = '',
  ): TemplateResult {
    return html`<a
      class="dm-item ${extra} ${active ? 'is-active' : ''}"
      href=${hrefOf(this.state as DemoState, view)}
      aria-current=${active ? 'page' : nothing}
      @click=${(event: MouseEvent) => this.open(event, view)}
      >${icon ? glyph(icon) : nothing}<span class="dm-item__label">${label}</span></a
    >`;
  }

  /** A group of the menu: its row opens and closes it, its entries under it. */
  private group(
    key: string,
    label: string,
    icon: GlyphName,
    holdsShown: boolean,
    entries: () => TemplateResult[],
    where: string,
  ): TemplateResult {
    const open = this.isOpen(key, holdsShown);
    const id = `dm-${where}-${key}`;
    return html`<button
        class="dm-item"
        aria-expanded=${open ? 'true' : 'false'}
        aria-controls=${id}
        @click=${() => this.toggle(key, holdsShown)}
      >
        ${glyph(icon)}<span class="dm-item__label">${label}</span
        ><span class="dm-item__chevron">${glyph('chevron')}</span>
      </button>
      <div class="dm-sub" id=${id} ?hidden=${!open}>${open ? entries() : nothing}</div>`;
  }

  private renderMenu(where: 'rail' | 'drawer'): TemplateResult {
    const state = this.state as DemoState;
    const lang = state.language;
    const { view } = state;
    const shownCard = view.kind === 'card' ? view.card : undefined;
    const shownGroup = shownCard ? groupOf(shownCard)?.key : undefined;
    const shownFamily = view.kind === 'sheet' ? familyOf(view.name)?.key : undefined;
    return html`<nav class="dm-nav" aria-label=${t(lang, 'nav.menu')}>
      ${this.item({ kind: 'overview' }, t(lang, 'nav.overview'), 'home', view.kind === 'overview')}
      <p class="dm-label">${t(lang, 'nav.cards')}</p>
      ${this.item({ kind: 'cards' }, t(lang, 'nav.all_cards'), 'grid', view.kind === 'cards')}
      ${CARD_GROUPS.map((group) =>
        this.group(
          group.key,
          t(lang, group.label),
          group.glyph,
          shownGroup === group.key,
          () =>
            group.cards.flatMap((short) => {
              const card = cardOf(short);
              return card
                ? [
                    this.item(
                      { kind: 'card', card: short },
                      wordsOf(card).name,
                      undefined,
                      shownCard === short,
                      'dm-item--card',
                    ),
                  ]
                : [];
            }),
          where,
        ),
      )}
      <p class="dm-label">${t(lang, 'nav.pages')}</p>
      ${PAGES.map((page) =>
        this.item(page.view, t(lang, page.label), page.glyph, page.view.kind === view.kind),
      )}
      ${this.group(
        'showcase',
        t(lang, 'nav.showcase'),
        'sparkle',
        shownFamily !== undefined,
        () =>
          FAMILIES.map((family) =>
            this.item(
              { kind: 'sheet', name: family.key },
              t(lang, family.label),
              undefined,
              shownFamily === family.key,
              'dm-item--card',
            ),
          ),
        where,
      )}
      <p class="dm-label">${t(lang, 'nav.themes')}</p>
      ${this.item({ kind: 'themes' }, t(lang, 'nav.themes'), 'palette', view.kind === 'themes')}
    </nav>`;
  }

  /* ---------- the look ---------- */

  private renderDots(row: boolean): TemplateResult {
    const state = this.state as DemoState;
    const chosen = typeof state.look.palette === 'string' ? state.look.palette : '';
    return html`<div
      class="dm-dots ${row ? 'dm-dots--row' : ''}"
      role="group"
      aria-label=${t(state.language, 'palette.title')}
    >
      ${this.palettes.map(
        (palette) =>
          html`<button
            class="dm-dot ${chosen === palette.name ? 'is-active' : ''}"
            data-target
            style="--dot:${palette.ink}"
            title=${palette.title}
            aria-label=${palette.title}
            aria-pressed=${chosen === palette.name ? 'true' : 'false'}
            @click=${() => this.change({ look: { ...state.look, palette: palette.name } })}
          ></button>`,
      )}
      <a
        class="dm-dot dm-dot--custom ${chosen === '' ? 'is-active' : ''}"
        data-target
        href=${hrefOf(state, { kind: 'panel', tab: 'appearance' })}
        title=${t(state.language, 'palette.custom')}
        aria-label=${t(state.language, 'palette.custom')}
        @click=${(event: MouseEvent) => {
          this.paletteOpen = false;
          this.open(event, { kind: 'panel', tab: 'appearance' });
        }}
      >
        ${glyph('plus')}
      </a>
    </div>`;
  }

  private renderLanguage(cls: string): TemplateResult {
    const lang = (this.state as DemoState).language;
    return html`<fluvy-select
      class=${cls}
      on-page
      .label=${t(lang, 'language.title')}
      .value=${lang}
      .options=${LANGUAGE_OPTIONS}
      @fluvy-change=${(event: CustomEvent<SelectChangeDetail>) => {
        const { value } = event.detail;
        if (isLanguageCode(value)) this.change({ language: value });
      }}
    ></fluvy-select>`;
  }

  private renderMode(): TemplateResult {
    const state = this.state as DemoState;
    const dark = state.mode === 'dark';
    return html`<button
      class="fv-round fv-round--on-page dm-mode ${dark ? 'is-on' : ''}"
      data-target
      title=${t(state.language, 'mode.dark')}
      aria-label=${t(state.language, 'mode.dark')}
      aria-pressed=${dark ? 'true' : 'false'}
      @click=${() => this.change({ mode: dark ? 'light' : 'dark' })}
    >
      ${glyph('moon')}
    </button>`;
  }

  private renderBrand(): TemplateResult {
    const state = this.state as DemoState;
    return html`<a
      class="dm-brand"
      href=${hrefOf(state, { kind: 'overview' })}
      @click=${(event: MouseEvent) => this.open(event, { kind: 'overview' })}
    >
      ${this.mark ? html`<img src=${this.mark} alt="" />` : nothing}
      <span class="dm-brand__text">
        <span class="dm-brand__name">Fluvy</span>
        <span class="dm-brand__sub">${t(state.language, 'brand.sub')}</span>
      </span>
    </a>`;
  }

  override render(): TemplateResult | typeof nothing {
    const state = this.state;
    if (!state) return nothing;
    const lang = state.language;
    const paletteName =
      typeof state.look.palette === 'string'
        ? (this.palettes.find((palette) => palette.name === state.look.palette)?.title ?? '')
        : t(lang, 'palette.custom');
    return html`
      <a
        class="dm-skip fv-btn fv-btn--accent"
        href="#stage"
        @click=${(event: Event) => {
          event.preventDefault();
          document.getElementById('stage')?.focus();
        }}
        >${t(lang, 'nav.skip')}</a
      >
      <header class="dm-top">
        <button
          class="fv-round fv-round--bare dm-menu-button"
          data-target
          aria-label=${t(lang, 'nav.open')}
          title=${t(lang, 'nav.open')}
          aria-haspopup="dialog"
          aria-expanded=${this.drawer ? 'true' : 'false'}
          @click=${(event: Event) => this.openDrawer(event)}
        >
          ${glyph('menu')}
        </button>
        ${this.renderBrand()} ${this.renderSearch(false)}
        <div class="dm-end">
          <button
            class="fv-round fv-round--bare dm-search-button"
            data-target
            aria-label=${t(lang, 'search.label')}
            title=${t(lang, 'search.label')}
            @click=${(event: Event) => this.openDrawer(event, true)}
          >
            ${glyph('search')}
          </button>
          <button
            class="fv-round fv-round--on-page dm-palette-button"
            data-target
            aria-label=${`${t(lang, 'palette.title')}: ${paletteName}`}
            title=${t(lang, 'palette.title')}
            aria-expanded=${this.paletteOpen ? 'true' : 'false'}
            aria-controls="dm-palette"
            @click=${() => (this.paletteOpen = !this.paletteOpen)}
          >
            <span class="dm-swatch"></span>
          </button>
          ${
            // the dots next to their button for the keys (Tab goes on into them), laid out under the bar
            this.paletteOpen
              ? html`<div
                  class="dm-pop"
                  id="dm-palette"
                  role="group"
                  aria-label=${t(lang, 'palette.title')}
                >
                  <div class="dm-pop__head">
                    <span class="dm-pop__title">${t(lang, 'palette.title')}</span>
                    <span class="dm-pop__name">${paletteName}</span>
                  </div>
                  ${this.renderDots(false)}
                </div>`
              : nothing
          }
          ${this.renderMode()} ${this.renderLanguage('dm-language dm-wide')}
          <a
            class="fv-round fv-round--on-page dm-wide"
            data-target
            href=${REPO}
            title=${t(lang, 'links.github')}
            aria-label=${t(lang, 'links.github')}
            >${glyph('code')}</a
          >
          <a
            class="fv-btn fv-btn--accent dm-install dm-wide"
            data-target
            data-fit="32"
            href=${INSTALL}
            >${t(lang, 'links.install')}</a
          >
        </div>
      </header>
      <div class="dm-body">
        <aside class="dm-rail">${this.renderMenu('rail')}</aside>
        <div class="dm-main"><slot></slot></div>
      </div>
      ${
        this.drawer
          ? html`<dialog
              class="dm-drawer ${this.leaving ? 'is-leaving' : ''}"
              aria-label=${t(lang, 'nav.menu')}
              @cancel=${(event: Event) => {
                event.preventDefault();
                this.closeDrawer();
              }}
              @click=${(event: MouseEvent) => {
                // the scrim, outside the drawer's own box
                if (event.target === event.currentTarget) {
                  const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
                  if (event.clientX > box.right || event.clientX < box.left) this.closeDrawer();
                }
              }}
            >
              <div class="dm-drawer__head">
                ${this.renderBrand()}
                <button
                  class="fv-round fv-round--bare dm-close"
                  data-target
                  aria-label=${t(lang, 'nav.close')}
                  title=${t(lang, 'nav.close')}
                  @click=${() => this.closeDrawer()}
                >
                  ${glyph('close')}
                </button>
              </div>
              <div class="dm-drawer__search">${this.renderSearch(true)}</div>
              <div class="dm-drawer__body">${this.query ? nothing : this.renderMenu('drawer')}</div>
              <div class="dm-drawer__foot">
                <div class="dm-scroll">${this.renderDots(true)}</div>
                <div class="dm-drawer__row">${this.renderMode()} ${this.renderLanguage('')}</div>
                <div class="dm-links">
                  <a class="fv-btn fv-btn--on-page" data-target href=${REPO}
                    >${glyph('code')}${t(lang, 'links.github')}</a
                  >
                  <a class="fv-btn fv-btn--accent" data-target href=${INSTALL}
                    >${glyph('download')}${t(lang, 'links.install')}</a
                  >
                </div>
              </div>
            </dialog>`
          : nothing
      }
      ${this.notice ? html`<div class="dm-toast" role="status">${this.notice}</div>` : nothing}
    `;
  }
}

if (!customElements.get('fluvy-demo-shell'))
  customElements.define('fluvy-demo-shell', FluvyDemoShell);

declare global {
  interface HTMLElementTagNameMap {
    'fluvy-demo-shell': FluvyDemoShell;
  }
}
