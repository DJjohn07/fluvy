// @vitest-environment happy-dom
import {
  setTintDefaults,
  type HassEntity,
  type HomeAssistant,
  type LovelaceCardConfig,
} from '@fluvy/core';
import { LIT_FLOOR } from '@fluvy/tokens/runtime';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { familiesDefined } from '../index.js';

/*
 * A device's state is always said, and may colour the card (1.22, #196): Lock, Cover, Alarm and Vacuum say their
 * state in the line where its badge gave way, in the warning's or the danger's ink; and the six device cards show
 * their state's tone beyond the circle only where asked (`tint`, else the house's), as a wash, the card's edge or the
 * control, each state in the config's colour where it names one (`state_colors`), their Tone and Colour acting.
 */

beforeAll(() => familiesDefined);
afterEach(() => {
  document.body.replaceChildren();
  setTintDefaults({ tint: 'off', style: 'wash' });
});

const STAMP = '2026-09-17T19:00:00+00:00';
const entity = (
  entity_id: string,
  state: string,
  attributes: Record<string, unknown> = {},
): HassEntity => ({
  entity_id,
  state,
  attributes: { friendly_name: 'Front door', ...attributes },
  last_changed: STAMP,
  last_updated: STAMP,
  context: { id: '', parent_id: null, user_id: null },
});
const house = (state: HassEntity): HomeAssistant =>
  ({
    language: 'en',
    locale: { language: 'en', number_format: 'language', time_format: '24' },
    config: { unit_system: { temperature: '°C' }, time_zone: 'UTC' },
    states: { [state.entity_id]: state },
    entities: {},
    devices: {},
    areas: {},
    themes: { darkMode: false },
    callService: async () => undefined,
  }) as unknown as HomeAssistant;

/** A ruler of 8 a letter, a badge its words and its sides: the widths a head is fitted by. */
const RULER = {
  width: (_cls: string, text: string) => text.length * 8,
  pill: (_cls: string, text: string, sides: number) => text.length * 8 + sides,
  clear() {},
};

type Drawn = HTMLElement & {
  setConfig(config: LovelaceCardConfig): void;
  hass: HomeAssistant;
  width: number;
  updateComplete: Promise<boolean>;
};

/** A card of `tag` drawing `state` at `width`, with `more` of its config. */
const draw = async (
  tag: string,
  state: HassEntity,
  more: Record<string, unknown> = {},
  width = 360,
): Promise<Element> => {
  const card = document.createElement(tag) as Drawn;
  const fits = card as unknown as { head?: object; headFit?: object };
  Object.assign(fits.headFit ?? fits.head ?? {}, { ruler: RULER });
  card.setConfig({ type: `custom:${tag}`, entity: state.entity_id, ...more });
  card.hass = house(state);
  card.width = width;
  document.body.append(card);
  await card.updateComplete;
  return card.shadowRoot!.querySelector('article')!;
};

const LIT = `-${Math.round(LIT_FLOOR * 100)}`;
const LOCK = 'fluvy-lock-card';
const unlocked = entity('lock.front_door', 'unlocked');
const locked = entity('lock.front_door', 'locked');

/** What the card's root wears of a tint: its classes of one, its wash and its edge. */
const worn = (article: Element) => ({
  tint: article.classList.contains('fv-tint'),
  glow: article.classList.contains('is-glow'),
  surface: article.getAttribute('data-surface'),
  edge: article.getAttribute('data-edge'),
});
const NONE = { tint: false, glow: false, surface: null, edge: null };

/** Every device card in a state it is active in, and the tone it says it in. */
const ACTIVE: ReadonlyArray<readonly [tag: string, state: HassEntity, tone: string]> = [
  [LOCK, unlocked, 'warning'],
  [
    'fluvy-cover-card',
    entity('cover.blind', 'open', { current_position: 60, supported_features: 15 }),
    'accent',
  ],
  ['fluvy-cover-card', entity('valve.garden', 'open', { supported_features: 3 }), 'water'],
  [
    'fluvy-alarm-card',
    entity('alarm_control_panel.house', 'triggered', { supported_features: 3 }),
    'warning',
  ],
  ['fluvy-vacuum-card', entity('vacuum.robot', 'cleaning', { supported_features: 8220 }), 'accent'],
  ['fluvy-fan-card', entity('fan.bedroom', 'on', { percentage: 50, supported_features: 1 }), 'fan'],
  [
    'fluvy-thermostat-card',
    entity('climate.living', 'heat', {
      current_temperature: 20.5,
      temperature: 21,
      hvac_modes: ['off', 'heat'],
      hvac_action: 'heating',
      min_temp: 7,
      max_temp: 30,
    }),
    'heat',
  ],
];

describe('a device card in its state’s tone', () => {
  it.each(ACTIVE)('%s draws as 1.21 did where nothing is asked', async (tag, state) => {
    expect(worn(await draw(tag, state))).toEqual(NONE);
  });

  it.each(ACTIVE)(
    '%s washes in its state’s tone while it is active (`tint: on`)',
    async (tag, state, tone) => {
      expect(worn(await draw(tag, state, { tint: 'on' }))).toEqual({
        tint: true,
        glow: true,
        surface: `${tone}${LIT}`,
        edge: null,
      });
    },
  );

  it.each(ACTIVE)('%s says it at its edge alone (`tint_style: edge`)', async (tag, state, tone) => {
    expect(worn(await draw(tag, state, { tint: 'on', tint_style: 'edge' }))).toEqual({
      tint: true,
      glow: false,
      surface: null,
      edge: tone,
    });
  });

  it.each(ACTIVE)(
    '%s follows the house where it says none, its own winning',
    async (tag, state, tone) => {
      setTintDefaults({ tint: 'on', style: 'edge' });
      expect(worn(await draw(tag, state)).edge).toBe(tone);
      expect(worn(await draw(tag, state, { tint: 'off' }))).toEqual(NONE);
    },
  );

  it('washes a rest that has a tone only where asked (`always`), quietly; a neutral rest never', async () => {
    expect(worn(await draw(LOCK, locked, { tint: 'on' }))).toEqual({ ...NONE, tint: true });
    expect(worn(await draw(LOCK, locked, { tint: 'always' })).surface).toBe('accent-0');
    const closed = entity('cover.blind', 'closed', { current_position: 0, supported_features: 15 });
    expect(worn(await draw('fluvy-cover-card', closed, { tint: 'always' })).surface).toBeNull();
  });

  it('draws the lock’s knob in the accent, a jammed bolt’s in the warning, until it is tinted: then in its state’s', async () => {
    const knob = (article: Element) =>
      /fv-knob--(\w+)/.exec(article.querySelector('.fv-knob')!.className)?.[1];
    expect(knob(await draw(LOCK, unlocked))).toBe('accent');
    const jammed = await draw(LOCK, entity('lock.front_door', 'jammed'));
    expect([knob(jammed), jammed.querySelector('.dv-slide--warning')]).not.toContain(null);
    // the reporter's mock-up: the knob's ring and dot alone
    const control = await draw(LOCK, unlocked, { tint: 'on', tint_style: 'control' });
    expect([knob(control), worn(control).surface, worn(control).edge]).toEqual([
      'warning',
      null,
      null,
    ]);
    expect(knob(await draw(LOCK, unlocked, { tint: 'on' }))).toBe('warning');
  });

  it('wears the config’s colour for a state: the circle, the badge and the wash', async () => {
    const colours = { state_colors: { unlocked: 'danger', locked: 'ok' } };
    const article = await draw(LOCK, unlocked, { ...colours, tint: 'on' });
    expect(article.querySelector('.fv-card__head .fv-ico--danger')).not.toBeNull();
    expect(article.querySelector('.fv-card__head .fv-badge--danger')).not.toBeNull();
    expect(worn(article).surface).toBe(`danger${LIT}`);
    const rest = await draw(LOCK, locked, { ...colours, tint: 'always' });
    expect(rest.querySelector('.fv-card__head .fv-ico--ok')).not.toBeNull();
    expect(worn(rest).surface).toBe('ok-0');
    // none: the neutral, which has no colour to show
    const quiet = await draw(LOCK, unlocked, { state_colors: { unlocked: 'none' }, tint: 'on' });
    expect(quiet.querySelector('.fv-card__head .fv-ico--neutral')).not.toBeNull();
    expect(worn(quiet)).toEqual({ ...NONE, tint: true });
    // a colour of the person's own stands in for the accent on the card's root
    const own = await draw(LOCK, unlocked, { state_colors: { unlocked: '#2a9d8f' }, tint: 'on' });
    expect(own.querySelector('.fv-card__head .fv-ico--accent')).not.toBeNull();
    expect(own.getAttribute('data-accent')).toBeTruthy();
  });

  it('keeps its skin out of reach, whatever it is asked', async () => {
    const away = entity('lock.front_door', 'unavailable');
    const article = await draw(LOCK, away, {
      tint: 'always',
      state_colors: { unavailable: 'danger' },
    });
    expect(worn(article)).toEqual({ ...NONE, tint: true });
    expect(article.classList.contains('is-unavailable')).toBe(true);
  });
});

describe('a device card’s Tone and Colour act (they did nothing on these six)', () => {
  const circle = (article: Element) =>
    /fv-ico--(\w+)/.exec(article.querySelector('.fv-card__head .fv-ico')!.className)?.[1];

  it.each(ACTIVE)('%s draws its active state in the tone asked', async (tag, state) => {
    const article = await draw(tag, state, { tone: 'armed' });
    // a status stays the status's: a tone stands in for the accent, never for a warning
    expect(circle(article)).toBe(tag === LOCK || tag === 'fluvy-alarm-card' ? 'warning' : 'armed');
  });

  it('draws a locked lock and an armed panel in the tone asked, a colour in the accent it redefines', async () => {
    expect(circle(await draw(LOCK, locked, { tone: 'armed' }))).toBe('armed');
    const armed = entity('alarm_control_panel.house', 'armed_away', { supported_features: 3 });
    expect(circle(await draw('fluvy-alarm-card', armed, { tone: 'armed' }))).toBe('armed');
    const fan = entity('fan.bedroom', 'on', { percentage: 50, supported_features: 1 });
    expect(circle(await draw('fluvy-fan-card', fan, { color: '#2a9d8f' }))).toBe('accent');
  });
});

describe('a device’s state is said where its badge gave way', () => {
  /** The line under the name, and what of it is said in a status's ink. */
  const said = (article: Element) => ({
    line: article.querySelector('.fv-card__sub')?.textContent?.trim() ?? '',
    inked: [...article.querySelectorAll('.fv-card__sub .fv-card__warn')].map((span) =>
      [/fv-tone--(\w+)/.exec(span.className)?.[1], span.textContent?.trim()].join(': '),
    ),
    badge: article.querySelector('.fv-card__head .fv-badge')?.textContent?.trim() ?? null,
  });
  const name = { name: 'Front door lock' };

  it('keeps the badge where it stands beside the name', async () => {
    expect(said(await draw(LOCK, unlocked, name)).badge).toBe('Unlocked');
  });

  it('leads the line in half a section, in the warning’s ink while it warns', async () => {
    const lock = said(await draw(LOCK, unlocked, name, 152));
    expect([lock.badge, lock.line.split(' · ')[0], lock.inked]).toEqual([
      null,
      'Unlocked',
      ['warning: Unlocked'],
    ]);
    const triggered = entity('alarm_control_panel.house', 'triggered', { supported_features: 3 });
    const alarm = said(await draw('fluvy-alarm-card', triggered, { name: 'House alarm' }, 152));
    expect([alarm.badge, alarm.inked]).toEqual([null, ['warning: Triggered']]);
  });

  it('leads it in the line’s ink where its tone is none of a status’s', async () => {
    const blind = entity('cover.blind', 'open', { current_position: 60, supported_features: 15 });
    const cover = said(await draw('fluvy-cover-card', blind, { name: 'Living room blind' }, 152));
    expect([cover.badge, cover.line.split(' · ')[0], cover.inked]).toEqual([null, 'Open', []]);
    const robot = entity('vacuum.robot', 'cleaning', { supported_features: 8220 });
    const vacuum = said(await draw('fluvy-vacuum-card', robot, { name: 'Robot vacuum' }, 152));
    expect([vacuum.badge, vacuum.line.split(' · ')[0]]).toEqual([null, 'Cleaning']);
  });

  it('is the danger’s ink where the config says the state in it', async () => {
    const lock = said(
      await draw(LOCK, unlocked, { ...name, state_colors: { unlocked: 'danger' } }, 152),
    );
    expect(lock.inked).toEqual(['danger: Unlocked']);
  });

  it('is left to the person’s own line where it says it already', async () => {
    const lock = said(await draw(LOCK, unlocked, { ...name, subtitle: 'Unlocked' }, 152));
    expect(lock.line).toBe('Unlocked');
  });
});
