import type { CustomCardEntry } from './ha/types.js';
import {
  onLanguage,
  onWords,
  pageLanguage,
  wordsIn,
  type KeyOf,
  type LanguageCode,
} from './i18n/index.js';
import { declareHeight, type LayoutHeight } from './layout-heights.js';

/** Where each card's page of the docs is: what the help link of Home Assistant's card editor opens. */
const DOCS = 'https://github.com/acosta290/fluvy/blob/main/docs/cards/';

/** A card's key in the catalogue (`cards`, `cards-about`) and the docs: its tag without `fluvy-` and `-card`. */
export const cardKey = (tag: string): string => tag.replace(/^fluvy-/, '').replace(/-card$/, '');

/** Fluvy's own entries of the card picker's list, by their key: the objects Home Assistant's array holds. */
const entries = new Map<string, CustomCardEntry>();

/** What says what a card is in a language: the `about` chunk's, once it has landed. */
let about: ((code: LanguageCode, card: string) => string) | undefined;

/**
 * A card's name in a language, after Fluvy's mark: Home Assistant's card picker sorts custom cards by name, which keeps
 * Fluvy's together.
 */
const nameIn = (code: LanguageCode, card: string): string =>
  `Fluvy · ${wordsIn(code)(`cards.${card as KeyOf<'cards'>}`)}`;

/** An entry's words in a language: its name, and what it is once `about` has landed. */
function speak(entry: CustomCardEntry, card: string, code: LanguageCode): void {
  entry.name = nameIn(code, card);
  if (about) entry.description = about(code, card);
}

/**
 * Says Fluvy's cards in the card picker's list in `code` (the page's language unless told), each entry rewritten in
 * place: Home Assistant keeps the array and reads it whenever its picker opens, so its picker, its card editor's title
 * and Customise speak the language with no change of their own. Runs as a language's words land, as `about` lands and
 * as the page's language changes.
 */
export function speakCards(code: LanguageCode = pageLanguage()): void {
  for (const [card, entry] of entries) speak(entry, card, code);
}

/** What says what each card is, from the `about` chunk as it lands: every entry says it from now on. */
export function describeCards(describe: (code: LanguageCode, card: string) => string): void {
  about = describe;
  speakCards();
}

onWords(() => speakCards());
onLanguage(speakCards);

/**
 * Every tag is defined synchronously while the module evaluates: Home Assistant gives a custom card
 * two seconds to exist before it paints an error card, and an `await` before `define` loses that race.
 */
export function registerCard(tag: string, element: CustomElementConstructor): void {
  if (!customElements.get(tag)) customElements.define(tag, element);
  // a card that knows its height at a 360 column says so here, for whoever lays cards out
  const { layoutHeight } = element as { layoutHeight?: unknown };
  announceCard(
    tag,
    typeof layoutHeight === 'function' ? (layoutHeight as LayoutHeight) : undefined,
  );
}

/**
 * A card whose element arrives with a chunk fetched at start (the energy family): its place in the card picker and
 * its height now, its element when the chunk lands. Home Assistant keeps a card of a tag not yet defined hidden and
 * builds it again the moment the tag is defined (`customElements.whenDefined`), so nothing is lost on the way.
 */
export function announceCard(tag: string, layoutHeight?: LayoutHeight): void {
  if (layoutHeight) declareHeight(tag, layoutHeight);
  const cards = (window.customCards ??= []);
  if (cards.some((card) => card.type === tag)) return;
  const card = cardKey(tag);
  const entry: CustomCardEntry = {
    type: tag,
    name: nameIn(pageLanguage(), card),
    preview: true,
    documentationURL: `${DOCS}${card}.md`,
  };
  entries.set(card, entry);
  cards.push(entry);
}
