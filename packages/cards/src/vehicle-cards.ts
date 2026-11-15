// the card's words first: they are here before it speaks
import './vehicle/english.js';
import { registerCard } from '@fluvy/core';
import { VEHICLE_FAMILY } from './vehicle-family.js';
import { FluvyVehicleCard } from './vehicle/vehicle-card.js';

/**
 * The Vehicle card's element: this module is its own chunk, fetched at start (`index.ts`) and defined as it lands.
 * Its height lives in `vehicle-family.ts`, which every page carries.
 */
export const CARDS = VEHICLE_FAMILY.map(
  ([tag]) => [tag, FluvyVehicleCard as CustomElementConstructor] as const,
);

for (const [tag, element] of CARDS) registerCard(tag, element);
