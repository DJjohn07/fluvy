import type { LovelaceCardConfig } from '@fluvy/core';
import type { FamilyEntry } from './energy-family.js';
import { COMPACT, listLength } from './shared/heights.js';

/**
 * The Cover card, announced at start and defined when its chunk lands (`cover-cards.ts`), as the Vacuum card is: what
 * the card picker lists and how tall the card is at a 360 column, without the card itself. Every page carries this
 * file: it stays tiny.
 */

/* cover / valve supported_features */
export const OPEN = 1;
export const CLOSE = 2;
export const SET_POSITION = 4;
export const STOP = 8;
export const OPEN_TILT = 16;
export const CLOSE_TILT = 32;
export const SET_TILT_POSITION = 128;
/** What a cover draws where the house is not there to say (`layoutHeight`; one never read): position, commands. */
export const USUAL = OPEN | CLOSE | SET_POSITION | STOP;

/**
 * The card's height at a 360 column, for the automatic dashboard's columns, for what the cover does (`features`, as
 * the house describes it: `house-heights.ts`): the ruler with its side column where it takes a position (the whole
 * card where the house is not there to say); else the tilt's readout and stepper over the commands; else the head
 * and the commands.
 */
export function coverHeight(config: LovelaceCardConfig, features = USUAL): number {
  if (config['variant'] === 'compact') return COMPACT;
  const tilt =
    config['show_tilt'] !== false &&
    (features & (SET_TILT_POSITION | OPEN_TILT | CLOSE_TILT)) !== 0;
  const positioned = (features & SET_POSITION) !== 0;
  const favorites =
    config['show_favorites'] !== false && listLength(config, ['favorites']) ? 88 : 0;
  return positioned ? 328 + favorites : tilt ? 224 : COMPACT;
}

export const COVER_FAMILY: readonly FamilyEntry[] = [['fluvy-cover-card', coverHeight]];
