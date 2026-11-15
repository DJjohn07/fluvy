// the card's words first: they are here before it speaks
import './template/english.js';
import { registerCard } from '@fluvy/core';
import { TEMPLATE_FAMILY } from './template-family.js';
import { FluvyTemplateCard } from './template/template-card.js';

/**
 * The template card's element: this module is its own chunk, fetched at start (`index.ts`) and defined as it lands.
 * Its height lives in `template-family.ts`, which every page carries.
 */
export const CARDS = TEMPLATE_FAMILY.map(
  ([tag]) => [tag, FluvyTemplateCard as CustomElementConstructor] as const,
);

for (const [tag, element] of CARDS) registerCard(tag, element);
