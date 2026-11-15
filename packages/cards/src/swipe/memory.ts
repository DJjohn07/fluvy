import { safeSession, type LovelaceCardConfig } from '@fluvy/core';
import { hash } from '../expander/memory.js';

/*
 * Where a person left a Swipe card, so a reload of the tab or a view opened again shows the page they were on: in this
 * tab's storage, never in the config (a gesture never writes a config), and only while it is not the page the card
 * starts on. `remember: off` keeps nothing, and the card opens on its `start` every time.
 */

export const REMEMBER = ['session', 'off'] as const;
export type Remember = (typeof REMEMBER)[number];

/** The table's key in this tab's storage. */
const KEY = 'fluvy:swipes';
/** How many cards it remembers: the oldest goes first. */
const KEPT = 100;

/** A card's key → the page it was left on (its card's place in `cards`). */
type Table = Readonly<Record<string, number>>;

/** The table as this tab keeps it: what is not a table is an empty one, an entry that is no page is skipped. */
function read(): Table {
  try {
    const raw: unknown = JSON.parse(safeSession()?.getItem(KEY) ?? '{}');
    return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
      ? Object.fromEntries(
          Object.entries(raw).filter(
            (entry): entry is [string, number] => Number.isInteger(entry[1]) && entry[1] >= 0,
          ),
        )
      : {};
  } catch {
    return {};
  }
}

/**
 * The key a card is remembered by: the view it stands on (the page's path) and what its pages are, each card's type
 * and entity — so the same card on another view keeps its own, and one given other pages starts afresh.
 */
export const swipeKey = (cards: readonly LovelaceCardConfig[], path: string): string =>
  hash(JSON.stringify([path, cards.map((card) => [card.type, card['entity'] ?? ''])]));

/** The page a card was left on, or undefined where nothing was kept. */
export const recall = (key: string): number | undefined => read()[key];

/** Keeps the page a card was left on, or forgets it (undefined: it is on the page it starts on). */
export function keep(key: string, page: number | undefined): void {
  const rest = Object.entries(read()).filter(([own]) => own !== key);
  const table = Object.fromEntries(
    (page === undefined ? rest : [...rest, [key, page] as const]).slice(-KEPT),
  );
  try {
    safeSession()?.setItem(KEY, JSON.stringify(table));
  } catch {
    // full or blocked: it is simply not remembered
  }
}
