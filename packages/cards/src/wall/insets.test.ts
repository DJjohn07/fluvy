// @vitest-environment happy-dom
import type { CSSResult, CSSResultGroup } from 'lit';
import { expect, it } from 'vitest';
import { FluvyWallBack } from './back.js';
import { FluvyWallCorner } from './corner.js';
import { FluvyWallScreensaver } from './screensaver.js';
import { FluvyWallToast } from './toast.js';

/*
 * A wall's pieces stand inside the screen's insets as Home Assistant says them (`--safe-area-inset-*`: the Companion
 * app's where it hands them on, the browser's under them), never the browser's alone; a wall has no frame, and the
 * notice that outlives it stands inside the frame as Home Assistant's own do.
 */

const PIECES: ReadonlyArray<readonly [string, { readonly styles?: CSSResultGroup }]> = [
  ['the corner', FluvyWallCorner],
  ['the way back', FluvyWallBack],
  ['the notice', FluvyWallToast],
  ['the screensaver', FluvyWallScreensaver],
];

it.each(PIECES)('%s reads the screen’s insets as Home Assistant says them', (_, piece) => {
  const text = ([piece.styles ?? []].flat(Infinity as 1) as CSSResult[])
    .map((sheet) => sheet.cssText)
    .join('\n')
    .replace(/\s+/g, ' ');
  expect(text).toMatch(
    /var\(--safe-area-inset-(top|right|bottom|left), env\(safe-area-inset-\1, 0px\)\)/,
  );
  expect(text).not.toMatch(
    /(?<!var\(--safe-area-inset-(top|right|bottom|left), )env\(safe-area-inset/,
  );
});
