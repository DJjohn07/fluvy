// @vitest-environment happy-dom
import type { HassEntity, HomeAssistant, LovelaceCardConfig } from '@fluvy/core';
import { afterEach, beforeAll, describe, expect, it, vi, type Mock } from 'vitest';
import { familiesDefined } from '../index.js';
import '../details/climate.js';

// the index fetches the lazy families, these cards among them: they land before this file's page goes
beforeAll(() => familiesDefined);

/*
 * #202: the value in force always shows. A hall air conditioner ran at `middle` while its firmware offered Low and High
 * alone, and no chip was marked: the card looked unset. Wherever a row of choices leaves the value in force out (a
 * speed, a preset, a mode the card's own list does not name, a select's option, a source past the row's cap), it
 * stands first, chosen, at full strength, and takes no tap; `none`, and a device out of reach, mark nothing.
 */

const STAMP = '2026-11-15T16:00:00Z';
const entity = (
  entity_id: string,
  state: string,
  attributes: Record<string, unknown>,
): HassEntity => ({
  entity_id,
  state,
  attributes: { friendly_name: 'Hall', ...attributes },
  last_changed: STAMP,
  last_updated: STAMP,
});

type House = HomeAssistant & { callService: Mock };
const house = (...states: HassEntity[]): House =>
  ({
    language: 'en',
    locale: { language: 'en', number_format: 'language', time_format: '24' },
    config: { unit_system: { temperature: '°C' }, time_zone: 'UTC' },
    states: Object.fromEntries(states.map((s) => [s.entity_id, s])),
    entities: {},
    devices: {},
    areas: {},
    localize: (key: string) => key,
    callService: vi.fn(async () => undefined),
    callWS: async () => ({}),
  }) as unknown as House;

type Drawn = HTMLElement & {
  setConfig(config: LovelaceCardConfig): void;
  hass: HomeAssistant;
  width: number;
  updateComplete: Promise<boolean>;
};

/** A card (or a docked sheet) drawn 360 wide on a house of the entity alone. */
async function draw(tag: string, state: HassEntity, more: Record<string, unknown> = {}) {
  const card = document.createElement(tag) as Drawn;
  card.setConfig({ type: `custom:${tag}`, entity: state.entity_id, ...more });
  const hass = house(state);
  card.hass = hass;
  card.width = 360;
  document.body.append(card);
  await card.updateComplete;
  await new Promise((resolve) => setTimeout(resolve));
  await card.updateComplete;
  return { root: card.shadowRoot!, hass };
}

/** Choices as they read: each one's words, `*` after the one chosen and `!` after one that takes no tap. */
const words = (chips: readonly HTMLElement[]): string[] =>
  chips.map((chip) => {
    const said = chip.querySelector('.fv-option__label')?.textContent ?? chip.textContent ?? '';
    const chosen = chip.getAttribute('aria-pressed') === 'true' ? '*' : '';
    return `${said.trim()}${chosen}${chip.getAttribute('aria-disabled') === 'true' ? '!' : ''}`;
  });
/** Every row of choices of a card as it reads (chips, or option tiles). */
const read = (root: ParentNode, selector = '.fv-chip'): string[] =>
  words([...root.querySelectorAll<HTMLElement>(selector)]);

/** The chips after the label that names their row. */
const rowAfter = (root: ParentNode, title: string): HTMLElement[] => {
  const label = [...root.querySelectorAll('.fv-label')].find(
    (l) => l.textContent?.trim() === title,
  );
  const row = label?.nextElementSibling;
  return row ? [...row.querySelectorAll<HTMLElement>('.fv-chip')] : [];
};

afterEach(() => document.body.replaceChildren());

describe('the thermostat (#202)', () => {
  /** The reporter's hall unit: a speed and a preset its firmware does not list. */
  const HALL = entity('climate.hall', 'cool', {
    hvac_modes: ['off', 'cool', 'heat'],
    temperature: 23,
    fan_modes: ['low', 'high'],
    fan_mode: 'middle',
    preset_modes: ['eco', 'boost'],
    preset_mode: 'sleep',
  });

  it('draws the speed it runs at first, chosen and inert, in Fluvy’s word for it: a tap on it calls nothing', async () => {
    const { root, hass } = await draw('fluvy-thermostat-card', HALL);
    const fans = rowAfter(root, 'Fan');
    expect(words(fans)).toEqual(['Mid*!', 'Low', 'High']);
    fans[0]?.click();
    expect(hass.callService).not.toHaveBeenCalled();
    fans[1]?.click();
    expect(hass.callService).toHaveBeenCalledWith(
      'climate',
      'set_fan_mode',
      { fan_mode: 'low' },
      { entity_id: 'climate.hall' },
    );
    expect(words(rowAfter(root, 'Preset'))).toEqual(['Sleep*!', 'Eco', 'Boost']);
  });

  it('marks nothing for a preset of none, and adds nothing to a row that offers the value', async () => {
    const { root } = await draw(
      'fluvy-thermostat-card',
      entity('climate.hall', 'cool', { ...HALL.attributes, fan_mode: 'high', preset_mode: 'none' }),
    );
    expect(words(rowAfter(root, 'Fan'))).toEqual(['Low', 'High*']);
    expect(words(rowAfter(root, 'Preset'))).toEqual(['Eco', 'Boost']);
  });

  it('draws the mode it runs where its own list leaves it out, as a tile', async () => {
    const { root, hass } = await draw(
      'fluvy-thermostat-card',
      entity('climate.hall', 'off', HALL.attributes),
      { modes: ['heat', 'cool'] },
    );
    expect(read(root, '.fv-option')).toEqual(['Off*!', 'Heat', 'Cool']);
    root.querySelector<HTMLElement>('.fv-option')?.click();
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('gives a water heater’s sixth place up to the seventh it runs, and says a humidifier’s mode it does not list', async () => {
    const tank = entity('water_heater.tank', 'high_demand', {
      operation_list: ['eco', 'heat_pump', 'off', 'electric', 'gas', 'performance', 'high_demand'],
      temperature: 50,
    });
    const { root } = await draw('fluvy-thermostat-card', tank);
    expect(read(root, '.fv-option')).toEqual([
      'High demand*!',
      'Eco',
      'Heat pump',
      'Off',
      'Electric',
      'Gas',
    ]);
    const humidifier = entity('humidifier.bedroom', 'on', {
      available_modes: ['normal', 'sleep'],
      mode: 'boost',
      humidity: 50,
    });
    const drawn = await draw('fluvy-thermostat-card', humidifier);
    expect(read(drawn.root, '.fv-option')).toEqual(['Boost*!', 'Off', 'Normal', 'Sleep']);
  });

  it('keeps its anatomy out of reach: nothing it last ran at is added', async () => {
    const { root } = await draw(
      'fluvy-thermostat-card',
      entity('climate.hall', 'unavailable', HALL.attributes),
    );
    // the dashed chips, none of them taking a tap
    expect(words(rowAfter(root, 'Fan'))).toEqual(['Low!', 'High!']);
    expect(words(rowAfter(root, 'Preset'))).toEqual(['Eco!', 'Boost!']);
  });

  it('draws the same in its details sheet: the mode a water heater runs past its first six', async () => {
    const tank = entity('water_heater.tank', 'high_demand', {
      operation_list: ['eco', 'heat_pump', 'off', 'electric', 'gas', 'performance', 'high_demand'],
      temperature: 50,
    });
    const { root } = await draw('fluvy-details-climate', tank, { _docked: true });
    expect(read(root)).toEqual(['High demand*!', 'Eco', 'Heat pump', 'Off', 'Electric', 'Gas']);
  });
});

describe('the fan and the vacuum (#202)', () => {
  it('draws the fan’s preset in force first where the fan does not list it', async () => {
    const fan = entity('fan.ceiling', 'on', {
      percentage: 66,
      percentage_step: 33.33,
      preset_modes: ['auto', 'sleep'],
      preset_mode: 'breeze',
      supported_features: 1 | 8,
    });
    const { root, hass } = await draw('fluvy-fan-card', fan);
    const chips = rowAfter(root, 'Preset');
    expect(words(chips)).toEqual(['Breeze*!', 'Auto', 'Sleep']);
    chips[0]?.click();
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('draws the robot’s suction in force first where its list leaves it out', async () => {
    const robot = entity('vacuum.robot', 'cleaning', {
      fan_speed_list: ['quiet', 'standard', 'strong'],
      fan_speed: 'max',
      supported_features: 8192 | 32 | 8 | 16,
    });
    const { root, hass } = await draw('fluvy-vacuum-card', robot);
    const chips = rowAfter(root, 'Suction');
    expect(words(chips)).toEqual(['Max*!', 'Quiet', 'Standard', 'Strong']);
    chips[0]?.click();
    expect(hass.callService).not.toHaveBeenCalled();
  });
});

describe('the media player (#202)', () => {
  const player = (source: string, source_list: readonly string[]) =>
    entity('media_player.den', 'on', { source, source_list, supported_features: 2048 | 128 | 256 });

  it('keeps every source it lists where there is room, the one in force first', async () => {
    // 1.21 dropped the last it lists to make room for the one in force: HDMI 2 went
    const { root } = await draw(
      'fluvy-media-card',
      player('Bluetooth', ['TV', 'HDMI 1', 'HDMI 2']),
    );
    expect(read(root)).toEqual(['Bluetooth*!', 'TV', 'HDMI 1', 'HDMI 2']);
  });

  it('lets the sixth give way where all six stand, and marks one of them as it always did', async () => {
    const eight = ['TV', 'HDMI 1', 'HDMI 2', 'HDMI 3', 'AirPlay', 'Spotify', 'Radio', 'Bluetooth'];
    expect(read((await draw('fluvy-media-card', player('Radio', eight))).root)).toEqual([
      'Radio*!',
      'TV',
      'HDMI 1',
      'HDMI 2',
      'HDMI 3',
      'AirPlay',
    ]);
    expect(read((await draw('fluvy-media-card', player('HDMI 1', eight))).root)).toEqual([
      'TV',
      'HDMI 1*',
      'HDMI 2',
      'HDMI 3',
      'AirPlay',
      'Spotify',
    ]);
  });
});

describe('the remote (#202)', () => {
  it('draws the source in force first where the player does not list it, and none of an app the apps row draws', async () => {
    const tv = (source: string) =>
      entity('media_player.tv', 'on', {
        friendly_name: 'Living room TV',
        device_class: 'tv',
        source,
        source_list: ['HDMI 1', 'HDMI 2', 'Netflix'],
        supported_features: 1 | 4 | 8 | 16 | 32 | 128 | 256 | 2048 | 4096 | 16384,
      });
    const config = { groups: ['source', 'apps'] };
    const { root, hass } = await draw('fluvy-remote-card', tv('Game console'), config);
    const chips = [...root.querySelectorAll<HTMLElement>('.fv-chip')];
    expect(read(root)).toEqual(['Game console*!', 'HDMI 1', 'HDMI 2']);
    chips[0]?.click();
    expect(hass.callService).not.toHaveBeenCalled();
    // a platform it does not list is a chip too: the apps row draws only the sources listed
    expect(read((await draw('fluvy-remote-card', tv('PlayStation 5'), config)).root)).toEqual([
      'PlayStation 5*!',
      'HDMI 1',
      'HDMI 2',
    ]);
    // Netflix it lists, and a platform: the apps row draws it, and marks it there
    expect(read((await draw('fluvy-remote-card', tv('Netflix'), config)).root)).toEqual([
      'HDMI 1',
      'HDMI 2',
    ]);
  });
});
