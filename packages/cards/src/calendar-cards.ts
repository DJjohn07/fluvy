import { registerCard } from '@fluvy/core';
import { CALENDAR_FAMILY } from './calendar-family.js';
import { FluvyCalendarCard } from './calendar/calendar-card.js';

/**
 * The calendar card's element: this module is its own chunk, fetched at start (`index.ts`) and defined as it lands.
 * Its height lives in `calendar-family.ts`, which every page carries.
 */
export const CARDS = CALENDAR_FAMILY.map(
  ([tag]) => [tag, FluvyCalendarCard as CustomElementConstructor] as const,
);

for (const [tag, element] of CARDS) registerCard(tag, element);
