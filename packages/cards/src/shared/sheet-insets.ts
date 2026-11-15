import { css, unsafeCSS, type CSSResult } from 'lit';

/**
 * The screen's inset on one side, as a term of a `calc()`, `max()` or `min()`: the one the Companion app hands Home
 * Assistant (`--safe-area-inset-*`), else the browser's, in the pixels of what is drawn at the size the variable `zoom`
 * names (a view's or a card's: the inset is the screen's, whatever the size).
 */
export const screenInset = (side: 'top' | 'right' | 'bottom' | 'left', zoom: string): CSSResult =>
  unsafeCSS(`var(--safe-area-inset-${side}, env(safe-area-inset-${side}, 0px)) / var(${zoom}, 1)`);

/**
 * Where a modal bottom sheet stands on a phone (#190), the one rule every sheet of ours shares (a light's details,
 * the alerts', the cameras', an item's, a schedule's, the room lights' colours, the robot's drive, the keypad, the
 * Energy period's, Customise's options): its foot clears the system's bar — the inset the Companion app hands Home
 * Assistant (`--safe-area-inset-bottom`), else the browser's — and a tall one stops short of the top by 24, or by the
 * status bar and the notch where they take more, so there is always scrim to tap and its body scrolls. The insets
 * are the screen's pixels: a sheet drawn larger (`--fv-zoom`, the size of the view or of the card that opened it)
 * takes them in its own.
 */
export const sheetInsets = css`
  dialog .fv-sheet {
    max-height: calc(100% - max(24px, ${screenInset('top', '--fv-zoom')}));
    padding-bottom: max(16px, ${screenInset('bottom', '--fv-zoom')});
  }
`;
