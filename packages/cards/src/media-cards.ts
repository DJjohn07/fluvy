// the family's words first: they are here before anything in its chunk says them
import './media/english.js';
import { registerCard } from '@fluvy/core';
import { MEDIA_FAMILY } from './media-family.js';
import { FluvyMediaCard } from './media/media-card.js';
import { FluvyNowPlayingCard } from './now-playing/now-playing-card.js';

/**
 * The media family's elements: this module is its own chunk, fetched at start (`index.ts`) and defined as it lands.
 * The heights live in `media-family.ts`, which every page carries.
 */
const ELEMENTS: Readonly<Record<string, CustomElementConstructor>> = {
  'fluvy-media-card': FluvyMediaCard,
  'fluvy-now-playing-card': FluvyNowPlayingCard,
};

export const CARDS = MEDIA_FAMILY.map(
  ([tag]) => [tag, ELEMENTS[tag] as CustomElementConstructor] as const,
);

for (const [tag, element] of CARDS) registerCard(tag, element);
