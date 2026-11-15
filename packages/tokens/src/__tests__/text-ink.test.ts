import { describe, expect, it } from 'vitest';
import { derivePalette, GATES } from '../build/derive.js';
import { withStatuses } from '../build/statuses.js';
import { contrastRatio } from '../color/index.js';
import { PALETTE_MODES } from '../config.js';
import { LIT_FLOOR, litSurface, textInk } from '../emit/vars.js';
import { COMMUNITY_PALETTES } from '../palettes/community/index.js';
import { seedList } from '../palettes/index.js';
import { seedOf } from '../runtime.js';
import { STATE_KEYS, type Palette, type PaletteModeColors, type RoleColors } from '../types.js';

/*
 * A figure said in the colour of the band its reading is in (1.22, #204): every tone a threshold may name — the accent,
 * the device colours, the statuses, the information's a Chart card's may — reads as text, 4.5, at 13 to 16 px, on the
 * card, the page and its own wash, in every palette and mode, a house's own statuses too. A device colour's ink is
 * held to 3 there (a glyph's): its figure's is taken deeper.
 */

const seeds = [
  ...seedList.map((seed) => [seed.name, seed] as const),
  ...COMMUNITY_PALETTES.map((file) => [file.name, seedOf(file.palette)] as const),
];
const palettes: ReadonlyArray<readonly [string, Palette]> = [
  ...seeds.map(([name, seed]) => [name, derivePalette(seed)] as const),
  // statuses a house picked for itself
  [
    'linen with its own statuses',
    withStatuses(seedList[0]!, derivePalette(seedList[0]!), {
      warning: '#f5c400',
      danger: '#ff2d55',
      success: '#34c759',
    }),
  ],
];

/** Every role a threshold's tone draws in, by its name. */
const roles = (colors: PaletteModeColors): ReadonlyArray<readonly [string, RoleColors]> => [
  ['accent', colors.accent],
  ...STATE_KEYS.map((key) => [key, colors.state[key]] as const),
  ['ok', colors.semantic.success],
  ['warning', colors.semantic.warning],
  ['danger', colors.semantic.danger],
  ['notice', colors.notice],
];

describe('a band’s figure reads as text in its colour (#204)', () => {
  it.each(palettes)(
    '%s, in every tone and mode, on the card, the page and its wash',
    (_, palette) => {
      for (const mode of PALETTE_MODES) {
        const colors = palette[mode];
        for (const [name, role] of roles(colors)) {
          const ink = textInk(role, colors);
          const wash = new Map(litSurface(role, colors, LIT_FLOOR)).get('--fluvy-card')!;
          for (const [ground, hex] of [
            ['card', colors.surface.card],
            ['page', colors.surface.page],
            ['wash', wash],
          ] as const)
            expect(
              contrastRatio(ink, hex),
              `${mode} ${name} on its ${ground}`,
            ).toBeGreaterThanOrEqual(GATES.text);
        }
      }
    },
  );

  it('keeps an ink that reads already, and takes a glyph’s deeper only as far as it must', () => {
    const linen = derivePalette(seedList.find((seed) => seed.name === 'linen')!);
    // dark: every ink reads on the dark card as it is
    for (const [, role] of roles(linen.dark)) expect(textInk(role, linen.dark)).toBe(role.ink);
    // light: a device colour held to 3 goes deeper, to just past 4.5 on the page it stands on
    const heat = linen.light.state['climate-heat'];
    const ink = textInk(heat, linen.light);
    expect(contrastRatio(heat.ink, linen.light.surface.page)).toBeLessThan(GATES.text);
    expect(ink).not.toBe(heat.ink);
    expect(contrastRatio(ink, linen.light.surface.page)).toBeLessThan(GATES.text + 0.5);
  });
});
