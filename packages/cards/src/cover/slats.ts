import { html, type TemplateResult } from 'lit';

/*
 * The tilt's picture (#203, the maintainer's design): the window seen from the room, the blind down. A 44 well holds a
 * 32 pane of daylight and five slats across it at a pitch of 6.4; a slat is 1.6 thick lying level (open: five
 * hairlines over the light) and 5.6 standing (shut: the five nearly meet, and the pane is the blind's own colour, its
 * light dimmed to 30 %). Its colours are the sheet's (`cover.css`).
 */

/** A slat's thickness lying level and standing, and the pitch of the five, in the picture's px. */
const THIN = 1.6;
const THICK = 5.6;
const PITCH = 6.4;
/** The first slat's centre, from the pane's top. */
const FIRST = 3.2;
const SLATS = [0, 1, 2, 3, 4];

/**
 * How open the slats are, from 0 (shut) to 1 (lying level), at `tilt` % of their travel: in proportion; where they
 * turn 135° or more (`angle`), through level and shut again the other way, open in the middle.
 */
export const openness = (tilt: number, angle: number): number =>
  angle >= 135 ? 1 - Math.abs(tilt / 50 - 1) : tilt / 100;

/**
 * The picture at `open` (0 to 1); none where the tilt cannot be read: no light, the slats half turned. `held` while the
 * ruler under it is dragged: it follows the finger, where it otherwise eases over 240 ms (at once with reduced
 * motion). Decorative: the ruler says the value and the words. A drawing for the measurer: its slats lie at a pitch
 * of 6.4, off the 4 grid by design.
 */
export function slats(open: number | null, held: boolean): TemplateResult {
  const k = Math.min(1, Math.max(0, open ?? 0.5));
  const scale = (THIN + (THICK - THIN) * (1 - k)) / THICK;
  return html`<span
    class="cv-slats ${held ? 'is-held' : ''}"
    aria-hidden="true"
    data-measure="drawn"
    ><span class="cv-slats__pane"
      ><span
        class="cv-slats__light"
        style="opacity:${open === null ? 0 : (0.3 + 0.7 * k).toFixed(3)}"
      ></span
      >${SLATS.map(
        (index) =>
          html`<i
            style="top:${(FIRST + PITCH * index - THICK / 2).toFixed(1)}px;transform:scaleY(${scale.toFixed(3)})"
          ></i>`,
      )}</span
    ></span
  >`;
}
