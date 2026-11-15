// the family's words first: they are here before anything in its chunk says them
import './automations/english.js';
import { registerCard } from '@fluvy/core';
import { AUTOMATIONS_FAMILY } from './automations-family.js';
import { FluvyAutomationsCard } from './automations/automations-card.js';

/**
 * The automations family's elements: this module is its own chunk, fetched at start (`index.ts`) and defined as it
 * lands. The height lives in `automations-family.ts`, which every page carries; the schedule
 * sheet is a chunk of its own, fetched the first time a schedule is opened.
 */
const ELEMENTS: Readonly<Record<string, CustomElementConstructor>> = {
  'fluvy-automations-card': FluvyAutomationsCard,
};

export const CARDS = AUTOMATIONS_FAMILY.map(
  ([tag]) => [tag, ELEMENTS[tag] as CustomElementConstructor] as const,
);

for (const [tag, element] of CARDS) registerCard(tag, element);
