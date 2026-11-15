import { registerCard } from '@fluvy/core';
import { WEATHER_FAMILY } from './weather-family.js';
import { FluvyWeatherCard } from './weather/weather-card.js';

/**
 * The weather card's element: this module is its own chunk, fetched at start (`index.ts`) and defined as it lands.
 * Its height lives in `weather-family.ts`, which every page carries.
 */
export const CARDS = WEATHER_FAMILY.map(
  ([tag]) => [tag, FluvyWeatherCard as CustomElementConstructor] as const,
);

for (const [tag, element] of CARDS) registerCard(tag, element);
