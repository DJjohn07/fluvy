/**
 * The cards' pictures in `docs/images/cards/`: each card's base example from the gallery in light and in dark, and
 * the manifest beside them that says what each was taken of and how large it is. `tools/render/cards.mjs` takes
 * them (Node reads this file as it is, its types stripped), `checks.ts` holds them to the gallery and `pages.ts`
 * shows them.
 */
import { createHash } from 'node:crypto';

/** The folder of the pictures, from the repository's root. */
export const FOLDER = 'docs/images/cards';
/** The manifest's file in it. */
export const MANIFEST = 'pictures.json';
export const MODES = ['light', 'dark'] as const;
export type Mode = (typeof MODES)[number];

/** A card's picture in a mode, by its short name: the file's name in the folder. */
export const pictureName = (short: string, mode: Mode): string => `${short}-${mode}.webp`;

/** What the manifest keeps of a card's pictures: the digest of the example they are of, their size in pixels. */
export interface PictureEntry {
  readonly example: string;
  readonly width: number;
  readonly height: number;
}
export type Manifest = Readonly<Record<string, PictureEntry | undefined>>;

/** The digest of an example as the playground mounts it (`mounted()`): what a picture is known to be of. */
export const digest = (mounted: unknown): string =>
  createHash('sha256').update(JSON.stringify(mounted)).digest('hex').slice(0, 12);
