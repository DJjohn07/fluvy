// the family's words first: they are here before anything in its chunk says them
import './alerts/english.js';
import { registerCard } from '@fluvy/core';
import { ALERTS_FAMILY } from './alerts-family.js';
import { FluvyAlertsCard } from './alerts/alerts-card.js';

/**
 * The alerts family's elements: this module is its own chunk, fetched at start (`index.ts`) and defined as it lands.
 * The height lives in `alerts-family.ts`, which every page carries; the alerts' sheet is a chunk
 * of its own, fetched the first time an alert is opened.
 */
const ELEMENTS: Readonly<Record<string, CustomElementConstructor>> = {
  'fluvy-alerts-card': FluvyAlertsCard,
};

export const CARDS = ALERTS_FAMILY.map(
  ([tag]) => [tag, ELEMENTS[tag] as CustomElementConstructor] as const,
);

for (const [tag, element] of CARDS) registerCard(tag, element);
