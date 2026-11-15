// @vitest-environment happy-dom
import type { HassEntity, HomeAssistant, LovelaceCardConfig } from '@fluvy/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { familiesDefined } from '../index.js';

/*
 * A device's state is always said (1.22, #196): Lock, Cover, Alarm and Vacuum say their state in the line where its
 * badge gave way, in the warning's or the danger's ink.
 */

beforeAll(() => familiesDefined);
afterEach(() => document.body.replaceChildren());

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

const LOCK = 'fluvy-lock-card';
const unlocked = entity('lock.front_door', 'unlocked');

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

  it('is left to the person’s own line where it says it already', async () => {
    const lock = said(await draw(LOCK, unlocked, { ...name, subtitle: 'Unlocked' }, 152));
    expect(lock.line).toBe('Unlocked');
  });
});
