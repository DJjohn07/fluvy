// the card's words first: they are here before it speaks
import './slider/english.js';
import { registerCard } from '@fluvy/core';
import { SLIDER_FAMILY } from './slider-family.js';
import { FluvySliderCard } from './slider/slider-card.js';

/**
 * The Slider card's element: this module is its own chunk, fetched at start (`index.ts`) and defined as it lands.
 * Its height lives in `slider-family.ts`, which every page carries.
 */
export const CARDS = SLIDER_FAMILY.map(
  ([tag]) => [tag, FluvySliderCard as CustomElementConstructor] as const,
);

for (const [tag, element] of CARDS) registerCard(tag, element);
