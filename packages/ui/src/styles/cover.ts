import { unsafeCSS } from 'lit';
import { coverCss } from './generated/cover.js';

/** The Cover card's sheet: a module of its own, so it travels in the Cover card's chunk. */
export const coverStyles = unsafeCSS(coverCss);
