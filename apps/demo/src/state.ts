import {
  CHART_DEFAULTS,
  isLanguageCode,
  parseChartSettings,
  parsePalette,
  parseSavedSeries,
  type ChartSettings,
  type LanguageCode,
  type Look,
  type SavedSeries,
} from '@fluvy/core';
import { TABS, type Tab } from '@fluvy/cards/panel/model';
import { isPaletteName, isPillName, isShapeName, type PaletteMode } from '@fluvy/tokens/runtime';
import { cardOf, layoutsOf } from './catalog.js';

/**
 * What the demo shows, and the URL that says it. The parameters are the playground's (`sheet`, `dashboard=auto` with
 * `view`, `mode`, `width`, `lang`, `palette`, `shape`, `pills`, `accent` with `character`, `base`, `fill`,
 * `highlight`, `charts`, `panel`, `history`, `activity`, `moment`, `at`), so every playground link opens here as it
 * does there; `device`, `card` with `layout`, `cards` and `themes` are the demo's own. A link that names no page opens
 * the overview.
 */

export type DeviceName = 'phone' | 'phone-l' | 'tablet' | 'desktop';

export interface Device {
  /** A dashboard column's width on that device (a section's, the design's 360 on a phone). */
  readonly frame: number;
  /** How many columns stand side by side. */
  readonly columns: number;
}

export const DEVICES: Readonly<Record<DeviceName, Device>> = {
  phone: { frame: 360, columns: 1 },
  'phone-l': { frame: 412, columns: 1 },
  tablet: { frame: 472, columns: 2 },
  desktop: { frame: 448, columns: 3 },
};
export const DEVICE_NAMES = Object.keys(DEVICES) as readonly DeviceName[];

/**
 * The house's chart settings (the panel's Charts tab): how every chart and gauge is drawn where a card says nothing,
 * and the sets of series colours the house keeps.
 */
export interface DemoCharts {
  readonly settings: ChartSettings;
  readonly sets: readonly SavedSeries[];
}

export type DemoLanguage = LanguageCode;

export type DemoView =
  /** What Fluvy is, how to install it, and its strongest frames. */
  | { readonly kind: 'overview' }
  /** Every card, by the README's groups. */
  | { readonly kind: 'cards' }
  /** A card's page: its example and each of its layouts, `layout` the one the link points at. */
  | { readonly kind: 'card'; readonly card: string; readonly layout?: string }
  /** A family of the playground's sheets, or one sheet, as frames. */
  | { readonly kind: 'sheet'; readonly name: string }
  /** A view of the automatic dashboard, by its path, as its strategy builds it from the demo house. */
  | { readonly kind: 'auto'; readonly view: string }
  /** The palettes, light and dark. */
  | { readonly kind: 'themes' }
  | { readonly kind: 'panel'; readonly tab: Tab }
  | { readonly kind: 'history'; readonly moment?: string }
  | { readonly kind: 'activity'; readonly moment?: string };

export interface DemoState {
  readonly view: DemoView;
  readonly mode: PaletteMode;
  readonly device: DeviceName;
  /** `width=`: one column at that width, whatever the device (the playground's links); undefined: the device's. */
  readonly frameWidth?: number | undefined;
  readonly language: DemoLanguage;
  readonly look: Look;
  readonly charts: DemoCharts;
  /** The moment the page's clock starts at. */
  readonly at: string;
  /** A Home Assistant path the page was opened on (Pages' 404 hands it over): said once, as a notice. */
  readonly path?: string;
}

/** The evening every sheet shows: Thursday 17 September 2026, 21:47. */
export const AT = '2026-09-17T21:47:12';
/** What the demo opens on: the light mode and Blaze, the electric line's warm palette. */
export const DEFAULT_LOOK: Look = { palette: 'blaze', shape: 'soft', pills: 'round' };
/** The factory's: `classic` everywhere, no sets of the house's own. */
export const DEFAULT_CHARTS: DemoCharts = { settings: CHART_DEFAULTS, sets: [] };
export const DEFAULT_VIEW: DemoView = { kind: 'overview' };
/** The automatic dashboard's first view, what `dashboard=auto` opens on. */
export const AUTO_HOME = 'home';

export const isDevice = (value: unknown): value is DeviceName =>
  typeof value === 'string' && Object.hasOwn(DEVICES, value);
/** One of the settings panel's tabs, as the panel has them: each opens inside the demo. */
export const isTab = (value: unknown): value is Tab =>
  typeof value === 'string' && (TABS as readonly string[]).includes(value);

function lookOf(params: URLSearchParams): Look {
  const accent = params.get('accent');
  const highlight = params.get('highlight');
  const custom = accent
    ? parsePalette({
        character: params.get('character') ?? 'vivid',
        base: params.get('base') ?? 'neutral',
        accent,
        fill: params.get('fill') ?? 'tint',
        ...(highlight ? { highlight } : {}),
      })
    : undefined;
  const palette = params.get('palette');
  const shape = params.get('shape');
  const pills = params.get('pills');
  return {
    palette: custom ?? (isPaletteName(palette) ? palette : DEFAULT_LOOK.palette),
    shape: isShapeName(shape) ? shape : DEFAULT_LOOK.shape,
    pills: isPillName(pills) ? pills : DEFAULT_LOOK.pills,
  };
}

/**
 * `charts=`, as the playground reads it: JSON with any of the settings' fields, each read as the settings read it (an
 * unknown word is its default), and `sets`, the saved series colours (`series` chooses one by its id).
 */
function chartsOf(params: URLSearchParams): DemoCharts {
  const raw = params.get('charts');
  if (!raw) return DEFAULT_CHARTS;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return DEFAULT_CHARTS;
  }
  return {
    settings: parseChartSettings(value),
    sets: parseSavedSeries((value as { sets?: unknown } | null)?.sets),
  };
}

/** The chart settings a link carries: the fields that are not the factory's, and the sets; nothing when all are. */
export function chartsParam(charts: DemoCharts): string | undefined {
  const changed = Object.fromEntries(
    Object.entries(charts.settings).filter(
      ([key, value]) =>
        JSON.stringify(value) !== JSON.stringify(CHART_DEFAULTS[key as keyof ChartSettings]),
    ),
  );
  const out = charts.sets.length ? { ...changed, sets: charts.sets } : changed;
  return Object.keys(out).length ? JSON.stringify(out) : undefined;
}

/** A view path of the automatic dashboard as its strategy writes them (`home`, `room-living`). */
const VIEW_PATH = /^[\w-]{1,64}$/;

/**
 * The page a URL names: the first of its page parameters, in the order below; the overview where it names none. Read
 * alone by back and forward, which move between pages and keep the look the visitor chose.
 */
export function parseView(params: URLSearchParams): DemoView {
  const panel = params.get('panel');
  if (panel !== null) return { kind: 'panel', tab: isTab(panel) ? panel : 'appearance' };
  const moment = params.get('moment');
  if (params.get('history') === '1') return { kind: 'history', ...(moment ? { moment } : {}) };
  if (params.get('activity') === '1') return { kind: 'activity', ...(moment ? { moment } : {}) };
  const card = cardOf(params.get('card') ?? '');
  if (card) {
    const layout = params.get('layout') ?? '';
    return {
      kind: 'card',
      card: card.short,
      ...(layoutsOf(card).includes(layout) ? { layout } : {}),
    };
  }
  if (params.get('dashboard') === 'auto') {
    const view = params.get('view') ?? '';
    return { kind: 'auto', view: VIEW_PATH.test(view) ? view : AUTO_HOME };
  }
  if (params.get('cards') === '1') return { kind: 'cards' };
  if (params.get('themes') === '1') return { kind: 'themes' };
  const sheet = params.get('sheet');
  return sheet ? { kind: 'sheet', name: sheet } : DEFAULT_VIEW;
}

/** A page's own parameters, as `viewOf` reads them back. */
function viewParams(view: DemoView, params: URLSearchParams): void {
  switch (view.kind) {
    case 'overview':
      return;
    case 'cards':
    case 'themes':
      params.set(view.kind, '1');
      return;
    case 'card':
      params.set('card', view.card);
      if (view.layout) params.set('layout', view.layout);
      return;
    case 'sheet':
      params.set('sheet', view.name);
      return;
    case 'auto':
      params.set('dashboard', 'auto');
      if (view.view !== AUTO_HOME) params.set('view', view.view);
      return;
    case 'panel':
      params.set('panel', view.tab);
      return;
    case 'history':
    case 'activity':
      params.set(view.kind, '1');
      if (view.moment) params.set('moment', view.moment);
  }
}

/** The device a screen of `viewportWidth` is: what the demo shows first, until the link or a chip says otherwise. */
export function deviceFor(viewportWidth: number): DeviceName {
  if (viewportWidth >= 1280) return 'desktop';
  if (viewportWidth >= 900) return 'tablet';
  return viewportWidth >= 400 ? 'phone-l' : 'phone';
}

/** The state a URL asks for; what it leaves unsaid is the default (the light mode) or the visitor's screen. */
export function parseState(params: URLSearchParams, viewportWidth = 0): DemoState {
  const mode = params.get('mode');
  const width = Number(params.get('width'));
  const device = params.get('device');
  const at = params.get('at');
  const path = params.get('path');
  return {
    view: parseView(params),
    mode: mode === 'dark' ? 'dark' : 'light',
    device: isDevice(device) ? device : deviceFor(viewportWidth),
    ...(Number.isInteger(width) && width >= 280 && width <= 1200 ? { frameWidth: width } : {}),
    language: isLanguageCode(params.get('lang')) ? (params.get('lang') as LanguageCode) : 'en',
    look: lookOf(params),
    charts: chartsOf(params),
    at: at && Number.isFinite(Date.parse(at)) ? at : AT,
    ...(path ? { path } : {}),
  };
}

/** The URL of a state: the playground's names, only what differs from the defaults (the mode and the device always: a link pins what was seen). */
export function serialize(state: DemoState): URLSearchParams {
  const params = new URLSearchParams();
  viewParams(state.view, params);
  params.set('mode', state.mode);
  params.set('device', state.device);
  if (state.frameWidth) params.set('width', String(state.frameWidth));
  if (state.language !== 'en') params.set('lang', state.language);
  const { palette, shape, pills } = state.look;
  if (typeof palette === 'string') {
    if (palette !== DEFAULT_LOOK.palette) params.set('palette', palette);
  } else {
    params.set('accent', palette.accent);
    params.set('character', palette.character);
    params.set('base', palette.base);
    if (palette.fill) params.set('fill', palette.fill);
    if (palette.highlight) params.set('highlight', palette.highlight);
  }
  if (shape !== DEFAULT_LOOK.shape) params.set('shape', shape);
  if (pills !== DEFAULT_LOOK.pills) params.set('pills', pills);
  const charts = chartsParam(state.charts);
  if (charts) params.set('charts', charts);
  if (state.at !== AT) params.set('at', state.at);
  return params;
}

/** A frame's width: the link's, else the device's column. */
export const frameWidth = (state: DemoState): number =>
  state.frameWidth ?? DEVICES[state.device].frame;

/** How many frames stand side by side: one at a link's width, else the device's columns. */
export const columns = (state: DemoState): number =>
  state.frameWidth ? 1 : DEVICES[state.device].columns;

/** Two views are the same thing on screen. */
export const sameView = (a: DemoView, b: DemoView): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/** Two views are the same page: a card's, whichever of its layouts the link points at, is one page. */
export const samePage = (a: DemoView, b: DemoView): boolean =>
  a.kind === 'card' && b.kind === 'card' ? a.card === b.card : sameView(a, b);
