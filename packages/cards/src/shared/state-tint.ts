import { tintDefaults, type HouseTint, type LightTint, type TintStyle } from '@fluvy/core';
import { LIT_FLOOR } from '@fluvy/tokens/runtime';
import { TONES, type Tone } from '@fluvy/ui';
import { nothing } from 'lit';
import { toneOf, type Coloured } from './colour.js';

/*
 * A tone a card shows beyond its circle (1.22, #196): a device's state, or any tone a card says now (a reading past a
 * threshold). The card says the tone and whether what it says is active; this says what its root wears for it
 * (`tintOf`) — a wash of the tone with its hairline, its closing edge alone, or nothing, where its control alone
 * takes it — and what a state's tone is where the config names its own (`stateLook`). One module for every card that
 * does, so a tint reads the same on all of them.
 */

/** What a card that shows a tone beyond its circle carries. */
export interface TintConfig {
  /**
   * When the tone shows beyond its circle: never (`off`), while what it says is active (`on`), or at rest too
   * (`always`: a rest that has a tone, never the neutral's); the house's where the card says none.
   */
  tint?: LightTint;
  /**
   * As what: a wash of the tone over the card with its hairline (`wash`), the card's closing edge alone (`edge`), or
   * the card's control alone (`control`: a lock's knob); the house's where the card says none.
   */
  tint_style?: TintStyle;
}

/** What a device card's editor shows of its state in colour (`stateTintFields`), among its own keys. */
export const STATE_TINT_KEYS = ['tint', 'tint_style', 'state_colors'] as const;

/** What a device card carries besides: its states' colours. */
export interface StateTintConfig extends TintConfig {
  /**
   * A state's tone, by the state as Home Assistant writes it (`unlocked: danger`): a tone's name, a colour (a name, a
   * hex), or `none` for the neutral. A state left out keeps the card's own.
   */
  state_colors?: Readonly<Record<string, string>>;
}

/** What a card's colours are asked (`FluvyCard.accents`). */
interface Accents {
  item(choice: unknown): string | undefined;
  lit(source: string, level: number): string;
  edge(source: string): string;
}

/** A tone as a card draws it now. */
export interface ToneLook {
  readonly tone: Tone;
  /**
   * The card root's `data-accent` while the tone is a colour of the person's own: it stands in for the accent inside
   * the card, which the tone then is.
   */
  readonly accent?: string | undefined;
}

/**
 * The tone a state is drawn in: the one the config gives it (`state_colors`: a tone, a colour, `none`); else `usual`,
 * the card's own for it — a rest (the neutral) and a status (a warning, a danger) as they are, any other in the card's
 * `tone` or `color` where it has one (`toneOf`). Out of reach (`off`) it is the skin's, whatever the config says.
 */
export function stateLook(
  accents: Accents,
  config: (Coloured & StateTintConfig) | undefined,
  state: string,
  usual: Tone,
): ToneLook {
  if (usual === 'off') return { tone: usual };
  const own = config?.state_colors?.[state];
  if (own === 'none') return { tone: 'neutral' };
  if ((TONES as readonly unknown[]).includes(own)) return { tone: own as Tone };
  const accent = own ? accents.item(own) : undefined;
  if (accent) return { tone: 'accent', accent };
  const still = usual === 'neutral' || usual === 'warning' || usual === 'danger';
  return { tone: still ? usual : toneOf(config, usual) };
}

/** What a card's root wears of a tone it shows. */
export interface Tinted {
  /** Its classes: `fv-tint` while it may be tinted (it eases into a tint), `is-glow` on a wash. */
  readonly cls: string;
  /** Its `data-surface`, a wash of the tone; `nothing` where it wears none. */
  readonly surface: string | typeof nothing;
  /** Its `data-edge`, its closing edge in the tone's ink; `nothing` where it wears none. */
  readonly edge: string | typeof nothing;
  /** Whether the tone shows now, in any style: what a control that keeps the accent otherwise takes it by. */
  readonly shown: boolean;
}

/**
 * What a card's root wears of the tone it says now, as its `tint` and `tint_style` ask — its own, else `house`'s (the
 * devices' default, fluvy's settings; a card of another kind hands its own). The tone shows while what it says is
 * `active`, and at rest too where asked (`always`); the neutral has no colour to show, and a card out of reach keeps
 * its skin. A wash is lit while active and quiet at rest (`litSurface`), where the card's own `card_color` is its rest.
 */
export function tintOf(
  accents: Accents,
  config: (TintConfig & { readonly card_color?: unknown }) | undefined,
  { tone, accent }: ToneLook,
  active: boolean,
  house: HouseTint = tintDefaults(),
): Tinted {
  const tint = config?.tint ?? house.tint;
  const style = config?.tint_style ?? house.style;
  const shown =
    tone !== 'neutral' && tone !== 'off' && (tint === 'always' || (tint === 'on' && active));
  const source = accent ?? tone;
  const wash = shown && style === 'wash' && (active || !config?.card_color);
  return {
    cls: tint === 'off' ? '' : wash ? 'fv-tint is-glow' : 'fv-tint',
    surface: wash ? accents.lit(source, active ? LIT_FLOOR : 0) : nothing,
    edge: shown && style === 'edge' ? accents.edge(source) : nothing,
    shown,
  };
}
