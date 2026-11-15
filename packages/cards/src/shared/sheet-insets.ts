import { css, unsafeCSS, type CSSResult } from 'lit';

/**
 * The screen's inset on one side, as a term of a `calc()`, `max()` or `min()`: the one the Companion app hands Home
 * Assistant (`--safe-area-inset-*`), else the browser's, in the pixels of what is drawn at the size the variable `zoom`
 * names (a view's or a card's: the inset is the screen's, whatever the size).
 */
export const screenInset = (side: 'top' | 'right' | 'bottom' | 'left', zoom: string): CSSResult =>
  unsafeCSS(`var(--safe-area-inset-${side}, env(safe-area-inset-${side}, 0px)) / var(${zoom}, 1)`);

/**
 * A modal bottom sheet's dialog, the frame every sheet of ours draws in (a light's details, the alerts', the cameras',
 * an item's, a schedule's, the room lights' colours, the robot's drive, the keypad, the Energy period's): the whole
 * screen under a scrim of the darkest neutral at 48 %, which fades in as the sheet (`.fv-sheet`, 392 at most) rises
 * from its foot, and out as it goes down again (`is-leaving`). A finger on the scrim moves nothing under it; one on
 * the sheet scrolls the sheet alone. A sheet drawn in the flow (the playground's) has no dialog, and none of this.
 */
export const sheetDialog = css`
  dialog {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    overflow: hidden;
    padding: 0;
    border: 0;
    background: color-mix(in srgb, var(--fluvy-neutral-05) 48%, transparent);
    color: inherit;
    touch-action: none;
    overscroll-behavior: contain;
    animation: fv-fade 240ms var(--fv-ease) both;
  }
  dialog[open] {
    display: flex;
  }
  dialog::backdrop {
    background: none;
  }
  @keyframes fv-sheet-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: none;
    }
  }
  @keyframes fv-sheet-down {
    to {
      transform: translateY(100%);
    }
  }
  @keyframes fv-sheet-out {
    to {
      opacity: 0;
    }
  }
  /* the sheet scrolls inside the dialog, which is the viewport */
  dialog .fv-sheet {
    max-width: 392px;
    overflow-y: auto;
    touch-action: pan-y;
    overscroll-behavior: contain;
    animation: fv-sheet-up 320ms var(--fv-ease-out) both;
  }
  dialog.is-leaving {
    animation: fv-sheet-out 200ms var(--fv-ease) both;
  }
  dialog.is-leaving .fv-sheet {
    animation: fv-sheet-down 200ms var(--fv-ease) both;
  }
  .fv-sheet {
    position: relative;
    width: 100%;
  }
`;

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
