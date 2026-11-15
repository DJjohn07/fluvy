import { setTintDefaults } from '@fluvy/core';
import { LIT_FLOOR } from '@fluvy/tokens/runtime';
import { nothing } from 'lit';
import { afterEach, describe, expect, it } from 'vitest';
import { stateLook, tintOf } from './state-tint.js';

/*
 * A tone a card shows beyond its circle (1.22, #196): what a state's tone is where the config names its own, and what
 * a card's root wears of it as its `tint` and `tint_style` ask — its own, else the house's.
 */

/** A card's colours as a stub: a colour of the person's own is its key, a wash its source and level, an edge its source. */
const accents = {
  item: (choice: unknown) =>
    typeof choice === 'string' && /^#[0-9a-f]{6}$|^indigo$/i.test(choice)
      ? `own-${choice}`
      : undefined,
  lit: (source: string, level: number) => `${source}-${Math.round(level * 100)}`,
  edge: (source: string) => source,
};

afterEach(() => setTintDefaults({ tint: 'off', style: 'wash' }));

describe('a state’s tone', () => {
  it('is the card’s own where the config names none: a rest and a status as they are, any other in its tone', () => {
    expect(stateLook(accents, {}, 'unlocked', 'warning')).toEqual({ tone: 'warning' });
    expect(stateLook(accents, {}, 'closed', 'neutral')).toEqual({ tone: 'neutral' });
    expect(stateLook(accents, {}, 'locked', 'accent')).toEqual({ tone: 'accent' });
    // the card's own tone and colour stand in for its accent, never for a status
    expect(stateLook(accents, { tone: 'armed' }, 'locked', 'accent')).toEqual({ tone: 'armed' });
    expect(stateLook(accents, { tone: 'armed' }, 'jammed', 'warning')).toEqual({ tone: 'warning' });
    expect(stateLook(accents, { color: '#123456' }, 'open', 'water')).toEqual({ tone: 'accent' });
  });

  it('is the config’s for the state: a tone, none, or a colour of the person’s own', () => {
    const config = {
      state_colors: { unlocked: 'danger', locked: 'ok', jammed: 'none', open: '#2a9d8f' },
    };
    expect(stateLook(accents, config, 'unlocked', 'warning')).toEqual({ tone: 'danger' });
    expect(stateLook(accents, config, 'locked', 'accent')).toEqual({ tone: 'ok' });
    expect(stateLook(accents, config, 'jammed', 'warning')).toEqual({ tone: 'neutral' });
    expect(stateLook(accents, config, 'open', 'warning')).toEqual({
      tone: 'accent',
      accent: 'own-#2a9d8f',
    });
    // a word that is no tone and no colour: the card's own
    expect(stateLook(accents, { state_colors: { locked: 'loud' } }, 'locked', 'accent')).toEqual({
      tone: 'accent',
    });
  });

  it('is the skin’s out of reach, whatever the config says', () => {
    expect(
      stateLook(accents, { state_colors: { unavailable: 'danger' } }, 'unavailable', 'off'),
    ).toEqual({ tone: 'off' });
  });
});

describe('what a card wears of its tone', () => {
  const warning = { tone: 'warning' as const };

  it('is nothing until it is asked, by the card or by the house: a house upgraded draws what it drew', () => {
    expect(tintOf(accents, {}, warning, true)).toEqual({
      cls: '',
      surface: nothing,
      edge: nothing,
      shown: false,
    });
    expect(tintOf(accents, { tint: 'off' }, warning, true).shown).toBe(false);
  });

  it('washes the card while what it says is active (`on`), with the lit floor, and eases into it', () => {
    const tinted = tintOf(accents, { tint: 'on' }, warning, true);
    expect(tinted).toEqual({
      cls: 'fv-tint is-glow',
      surface: `warning-${Math.round(LIT_FLOOR * 100)}`,
      edge: nothing,
      shown: true,
    });
    // at rest it waits, ready to ease in
    expect(tintOf(accents, { tint: 'on' }, warning, false)).toEqual({
      cls: 'fv-tint',
      surface: nothing,
      edge: nothing,
      shown: false,
    });
  });

  it('washes at rest too where asked (`always`), quietly, but never in the neutral, and never over the card’s own colour', () => {
    expect(tintOf(accents, { tint: 'always' }, { tone: 'accent' }, false).surface).toBe('accent-0');
    expect(tintOf(accents, { tint: 'always' }, { tone: 'neutral' }, false).shown).toBe(false);
    const own = tintOf(
      accents,
      { tint: 'always', card_color: 'indigo' },
      { tone: 'accent' },
      false,
    );
    expect([own.shown, own.surface, own.cls]).toEqual([true, nothing, 'fv-tint']);
    // active, the state's wash is over the card's own colour
    expect(tintOf(accents, { tint: 'always', card_color: 'indigo' }, warning, true).surface).toBe(
      `warning-${Math.round(LIT_FLOOR * 100)}`,
    );
  });

  it('says it at the card’s edge alone (`edge`), or leaves it to the control (`control`)', () => {
    expect(tintOf(accents, { tint: 'on', tint_style: 'edge' }, warning, true)).toEqual({
      cls: 'fv-tint',
      surface: nothing,
      edge: 'warning',
      shown: true,
    });
    expect(tintOf(accents, { tint: 'on', tint_style: 'control' }, warning, true)).toEqual({
      cls: 'fv-tint',
      surface: nothing,
      edge: nothing,
      shown: true,
    });
  });

  it('wears a colour of the person’s own as its source', () => {
    const own = { tone: 'accent' as const, accent: 'own-#2a9d8f' };
    expect(tintOf(accents, { tint: 'on', tint_style: 'edge' }, own, true).edge).toBe('own-#2a9d8f');
  });

  it('is the house’s where the card says none, the card’s own winning', () => {
    setTintDefaults({ tint: 'on', style: 'edge' });
    expect(tintOf(accents, {}, warning, true).edge).toBe('warning');
    expect(tintOf(accents, { tint: 'off' }, warning, true).shown).toBe(false);
    expect(tintOf(accents, { tint_style: 'wash' }, warning, true).edge).toBe(nothing);
    // a card of another kind hands its own house
    expect(tintOf(accents, {}, warning, true, { tint: 'off', style: 'wash' }).shown).toBe(false);
  });
});
