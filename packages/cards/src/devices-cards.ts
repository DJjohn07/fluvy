// the family's words first: they are here before anything in its chunk says them
import './devices/english.js';
import { registerCard } from '@fluvy/core';
import { FluvyAlarmCard } from './alarm/alarm-card.js';
import { FluvyCameraCard } from './camera/camera-card.js';
import { FluvyCamerasCard } from './camera/cameras-card.js';
import { DEVICES_FAMILY } from './devices-family.js';
import { FluvyLockCard } from './lock/lock-card.js';
import { FluvyPrinterCard } from './printer/printer-card.js';

/**
 * The devices family's elements: this module is its own chunk, fetched at start (`index.ts`) and defined as it lands.
 * The heights live in `devices-family.ts`, which every page carries.
 */
const ELEMENTS: Readonly<Record<string, CustomElementConstructor>> = {
  'fluvy-lock-card': FluvyLockCard,
  'fluvy-alarm-card': FluvyAlarmCard,
  'fluvy-camera-card': FluvyCameraCard,
  'fluvy-cameras-card': FluvyCamerasCard,
  'fluvy-printer-card': FluvyPrinterCard,
};

export const CARDS = DEVICES_FAMILY.map(
  ([tag]) => [tag, ELEMENTS[tag] as CustomElementConstructor] as const,
);

for (const [tag, element] of CARDS) registerCard(tag, element);
