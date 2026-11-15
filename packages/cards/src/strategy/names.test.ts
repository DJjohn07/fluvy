// @vitest-environment happy-dom
import type { HomeAssistant } from '@fluvy/core';
import { demoHass, type DemoEntity } from '@fluvy/demo-home';
import { afterAll, describe, expect, it } from 'vitest';
// the cards register their heights with core: the strategy lays columns out with them
import { familiesDefined } from '../index.js';
import { generate } from './generate.js';
import { HomeRegistry } from './home-registry.js';
import type { FluvyStrategyConfig, View } from './types.js';

// the families' chunks are fetched as the module loads: they land before the file's environment goes
afterAll(() => familiesDefined);

/*
 * How a dashboard names what it names by entity (`names`, 1.22, #200). The reporter's house is Dutch: a motion sensor
 * reads "Eettafel VS Beweging", its device's name and its entity's, and he asked for "Beweging". Unsaid, every
 * dashboard is what it was; `entity` says each entity's own name, its device's where it has none, two alike on one
 * card told apart by their devices; `full` says Home Assistant's friendly name everywhere.
 */

const entity = (
  id: string,
  state: string,
  attributes: Record<string, unknown> = {},
  registry: Record<string, unknown> = {},
): DemoEntity => ({ id, state, attributes, registry });

/** An entity of a device: Home Assistant's friendly name is the device's and the entity's own (none: the device's). */
const of = (
  device: string,
  id: string,
  state: string,
  own: string | null,
  attributes: Record<string, unknown> = {},
): DemoEntity =>
  entity(
    id,
    state,
    { friendly_name: own ? `${DEVICES[device]} ${own}` : DEVICES[device], ...attributes },
    { device_id: device, name: own },
  );

/** The reporter's devices, all in his dining room. */
const DEVICES: Readonly<Record<string, string>> = {
  'd-eettafel': 'Eettafel VS',
  'd-keuken': 'Keuken VS',
  'd-voordeur': 'Voordeur',
  'd-raam': 'Raam eetkamer',
  'd-achterdeur': 'Achterdeur',
  'd-koffie': 'Koffiehoek',
  'd-aanrecht': 'Aanrecht',
  'd-hue': 'Eetkamer',
};

const motion = { device_class: 'motion' };
const outlet = { device_class: 'outlet' };
const onoff = { supported_color_modes: ['onoff'] };

/**
 * The reporter's dining room: two multi-sensors, each with its motion and its battery; a front door that is its
 * device's own entity; a window contact of an older integration, which writes the whole name; two locks and two plugs
 * that read alike by their own names; a lamp of no device; a scene of a Hue room and one of no device.
 */
function reporter(): HomeAssistant {
  const hass = demoHass({
    more: [
      of('d-eettafel', 'binary_sensor.eettafel_vs_beweging', 'off', 'Beweging', motion),
      of('d-keuken', 'binary_sensor.keuken_vs_beweging', 'on', 'Beweging', motion),
      of('d-voordeur', 'binary_sensor.voordeur', 'off', null, { device_class: 'door' }),
      entity(
        'binary_sensor.raam_contact',
        'on',
        { friendly_name: 'Raam eetkamer Contact', device_class: 'window' },
        { device_id: 'd-raam', name: 'Raam eetkamer Contact' },
      ),
      of('d-eettafel', 'sensor.eettafel_vs_batterij', '81', 'Batterij', {
        device_class: 'battery',
        unit_of_measurement: '%',
      }),
      of('d-keuken', 'sensor.keuken_vs_batterij', '64', 'Batterij', {
        device_class: 'battery',
        unit_of_measurement: '%',
      }),
      of('d-voordeur', 'lock.voordeur_slot', 'locked', 'Slot'),
      of('d-achterdeur', 'lock.achterdeur_slot', 'locked', 'Slot'),
      of('d-koffie', 'switch.koffiehoek_stopcontact', 'on', 'Stopcontact', outlet),
      of('d-aanrecht', 'switch.aanrecht_stopcontact', 'off', 'Stopcontact', outlet),
      entity('light.eetkamer_hanglamp', 'on', { friendly_name: 'Eetkamer Hanglamp', ...onoff }),
      of('d-hue', 'scene.eetkamer_diner', 'unknown', 'Diner'),
      entity('scene.eetkamer_ontbijt', 'unknown', { friendly_name: 'Eetkamer Ontbijt' }),
    ],
  }) as unknown as HomeAssistant;
  hass.areas['eetkamer'] = { area_id: 'eetkamer', name: 'Eetkamer' } as never;
  for (const [id, name] of Object.entries(DEVICES))
    hass.devices[id] = { id, name, area_id: 'eetkamer' } as never;
  for (const id of ['light.eetkamer_hanglamp', 'scene.eetkamer_ontbijt'])
    (hass.entities[id] as { area_id?: string }).area_id = 'eetkamer';
  return hass;
}

type Card = Record<string, unknown>;

const cardsIn = (views: readonly View[], path: string): Card[] =>
  views
    .filter((view) => view.path === path)
    .flatMap((view) => view.sections.flatMap((section) => section.cards as Card[]));

/**
 * What a view's cards call each entity, by entity: a card's own, its rows', its tiles', its scenes', a Sensors card's
 * entries'; `null` where the card is left to say Home Assistant's name itself.
 */
function names(views: readonly View[], path: string): Record<string, string | null> {
  const named: Record<string, string | null> = {};
  for (const card of cardsIn(views, path)) {
    if (typeof card['entity'] === 'string')
      named[card['entity']] = (card['name'] as string | undefined) ?? null;
    for (const key of ['rows', 'tiles', 'scenes', 'entities'])
      for (const item of (card[key] as unknown[] | undefined) ?? [])
        if (typeof item === 'string') named[item] = null;
        else {
          const { entity: id, name } = item as { entity?: string; name?: string };
          if (id) named[id] = name ?? null;
        }
  }
  return named;
}

const SENSORS = 'custom:fluvy-openings-card';
/** What a view's Sensors card lists, as the dashboard wrote it. */
const sensors = (views: readonly View[], path: string): unknown =>
  cardsIn(views, path).find((card) => card['type'] === SENSORS)?.['entities'];

const dashboard = (config: Partial<FluvyStrategyConfig> = {}, hass = reporter()) =>
  generate(
    { type: 'custom:fluvy-home', caps: 'none', ...config } as FluvyStrategyConfig,
    hass as never,
  );

describe('the dashboards’ names (#200)', () => {
  it('names nothing otherwise until asked: unsaid, `auto` and a word it does not know are one dashboard', async () => {
    const unsaid = await dashboard();
    expect(await dashboard({ names: 'auto' })).toEqual(unsaid);
    expect(await dashboard({ names: 'device' as never })).toEqual(unsaid);
    // as the dashboards always named them: the Sensors card Home Assistant's, a row its device where its own name
    // only says a kind of reading
    expect(sensors(unsaid.views, 'room-eetkamer')).toEqual([
      'binary_sensor.eettafel_vs_beweging',
      'binary_sensor.keuken_vs_beweging',
      'binary_sensor.raam_contact',
      'binary_sensor.voordeur',
    ]);
    expect(names(unsaid.views, 'home')).toMatchObject({
      'binary_sensor.eettafel_vs_beweging': 'Eettafel VS',
      'binary_sensor.keuken_vs_beweging': 'Keuken VS',
    });
  });

  it('says each entity’s own name where asked, its device’s where it has none, two alike on one card told apart', async () => {
    const { views } = await dashboard({ names: 'entity' });
    // the reporter's card: "Beweging", as he asked, each with its device since two read alike; the door is its device
    // (the card says so itself), and the older contact reads without its device in front of it
    expect(sensors(views, 'room-eetkamer')).toEqual([
      { entity: 'binary_sensor.eettafel_vs_beweging', name: 'Beweging · Eettafel VS' },
      { entity: 'binary_sensor.keuken_vs_beweging', name: 'Beweging · Keuken VS' },
      { entity: 'binary_sensor.raam_contact', name: 'Contact' },
      'binary_sensor.voordeur',
    ]);
    // Home's Security rows and the Security view's own Sensors card say the same
    expect(names(views, 'home')).toMatchObject({
      'binary_sensor.eettafel_vs_beweging': 'Beweging · Eettafel VS',
      'binary_sensor.keuken_vs_beweging': 'Beweging · Keuken VS',
      'binary_sensor.raam_contact': 'Contact',
      'binary_sensor.voordeur': null,
    });
    // the house's own leak sensor among them is no device's: Home Assistant's name is its own
    expect(sensors(views, 'security')).toEqual([
      { entity: 'binary_sensor.eettafel_vs_beweging', name: 'Beweging · Eettafel VS' },
      { entity: 'binary_sensor.keuken_vs_beweging', name: 'Beweging · Keuken VS' },
      'binary_sensor.kitchen_leak',
      { entity: 'binary_sensor.raam_contact', name: 'Contact' },
      'binary_sensor.voordeur',
    ]);
    // tiles: a plug by its own word, two alike told apart; a lamp of no device is its own name already
    expect(names(views, 'room-eetkamer')).toMatchObject({
      'switch.koffiehoek_stopcontact': 'Stopcontact · Koffiehoek',
      'switch.aanrecht_stopcontact': 'Stopcontact · Aanrecht',
      'light.eetkamer_hanglamp': null,
    });
  });

  it('tells one alone apart from nothing: a name said once is the entity’s own, with no device after it', async () => {
    const hass = reporter();
    delete (hass.states as Record<string, unknown>)['binary_sensor.keuken_vs_beweging'];
    delete (hass.states as Record<string, unknown>)['switch.aanrecht_stopcontact'];
    const { views } = await dashboard({ names: 'entity' }, hass);
    expect(names(views, 'room-eetkamer')).toMatchObject({
      'binary_sensor.eettafel_vs_beweging': 'Beweging',
      'switch.koffiehoek_stopcontact': 'Stopcontact',
    });
  });

  it('tells the cards it builds an entity each apart where asked, and leaves them each by itself where not', async () => {
    const locks = (views: readonly View[]) => {
      const said = names(views, 'security');
      return [said['lock.voordeur_slot'], said['lock.achterdeur_slot']];
    };
    expect(locks((await dashboard({ names: 'entity' })).views)).toEqual([
      'Slot · Voordeur',
      'Slot · Achterdeur',
    ]);
    // unsaid, each lock as the dashboards always called it; in full, as Home Assistant does
    const unsaid = locks((await dashboard()).views);
    expect(unsaid[0]).toBe(unsaid[1]);
    expect(locks((await dashboard({ names: 'full' })).views)).toEqual([null, null]);
  });

  it('says the friendly name everywhere in full: no card is given a name where Home Assistant’s is said once', async () => {
    const { views } = await dashboard({ names: 'full' });
    expect(sensors(views, 'room-eetkamer')).toEqual([
      'binary_sensor.eettafel_vs_beweging',
      'binary_sensor.keuken_vs_beweging',
      'binary_sensor.raam_contact',
      'binary_sensor.voordeur',
    ]);
    // a row, a tile, a scene: what the dashboards named by entity is left to Home Assistant's name
    for (const path of ['home', 'room-eetkamer', 'security'])
      for (const [id, name] of Object.entries(names(views, path)))
        if (/^(binary_sensor|switch|light|lock|scene)\./.test(id))
          expect(name, `${path}: ${id}`).toBeNull();
  });

  it('keeps what is named by its device or its place: the batteries and the readings say what they said', async () => {
    const lists = (views: readonly View[]) => ({
      batteries: names(views, 'sensors')['sensor.eettafel_vs_batterij'],
      readings: cardsIn(views, 'climate').filter((card) => card['type'] !== SENSORS),
    });
    const unsaid = lists((await dashboard()).views);
    expect(unsaid.batteries).toBe('Eettafel VS');
    expect(lists((await dashboard({ names: 'entity' })).views)).toEqual(unsaid);
    expect(lists((await dashboard({ names: 'full' })).views)).toEqual(unsaid);
  });

  it('reads a name short under its room’s label where the lights stand by room, and whole in full', async () => {
    const lamp = async (config: Partial<FluvyStrategyConfig>) =>
      names((await dashboard({ group_by: 'room', ...config })).views, 'home')[
        'light.eetkamer_hanglamp'
      ];
    expect(await lamp({})).toBe('Hanglamp');
    expect(await lamp({ names: 'entity' })).toBe('Hanglamp');
    expect(await lamp({ names: 'full' })).toBeNull();
  });

  it('names the scenes by their own names, short under their room’s on the house’s card, and whole in full', async () => {
    const scenes = async (config: Partial<FluvyStrategyConfig>) => {
      const { views } = await dashboard({ group_by: 'room', ...config });
      const card = cardsIn(views, 'home').find(
        (one) => one['type'] === 'custom:fluvy-scenes-card',
      ) as Card;
      const said = names(views, 'home');
      return {
        short: card['short_names'],
        diner: said['scene.eetkamer_diner'],
        ontbijt: said['scene.eetkamer_ontbijt'],
      };
    };
    // unsaid, the card reads Home Assistant's names short itself
    expect(await scenes({})).toEqual({ short: undefined, diner: null, ontbijt: null });
    // the scene's own name, and the other's without its room: the dashboard's own to say, the card shortens none
    expect(await scenes({ names: 'entity' })).toEqual({
      short: false,
      diner: 'Diner',
      ontbijt: 'Ontbijt',
    });
    expect(await scenes({ names: 'full' })).toEqual({ short: false, diner: null, ontbijt: null });
  });

  it('names a wall’s rows and its scenes’ chips as asked', async () => {
    const wall = async (names?: FluvyStrategyConfig['names']) => {
      const { views } = await generate(
        { type: 'custom:fluvy-wall', scenes_max: 8, ...(names ? { names } : {}) },
        reporter() as never,
      );
      const chips = cardsIn(views, 'wall').flatMap(
        (card) => (card['chips'] as { name: string }[] | undefined) ?? [],
      );
      return chips.map((chip) => chip.name).filter((name) => /Diner/.test(name));
    };
    // a wall's chips always said a scene without its device in front of it
    expect(await wall()).toEqual(['Diner']);
    expect(await wall('entity')).toEqual(['Diner']);
    expect(await wall('full')).toEqual(['Eetkamer Diner']);
  });
});

describe('the house’s names, as a dashboard asks for them', () => {
  const home = (names?: 'entity' | 'full') => new HomeRegistry(reporter(), {}, undefined, names);

  it('reads an entity’s own name as Home Assistant does: without its device in front, its device’s where it has none', () => {
    const asked = home('entity');
    expect(asked.entityLabel('binary_sensor.eettafel_vs_beweging')).toBe('Beweging');
    expect(asked.entityLabel('binary_sensor.voordeur')).toBe('Voordeur');
    expect(asked.entityLabel('binary_sensor.raam_contact')).toBe('Contact');
    // an entity of no device, or one the house does not hold: its name as it is
    expect(asked.entityLabel('light.eetkamer_hanglamp')).toBe('Eetkamer Hanglamp');
    expect(asked.entityLabel('light.gone')).toBe('light.gone');
  });

  it('reads the friendly name in full, and what the dashboards always said where none is asked', () => {
    expect(home('full').entityLabel('binary_sensor.eettafel_vs_beweging')).toBe(
      'Eettafel VS Beweging',
    );
    expect(home().entityLabel('binary_sensor.eettafel_vs_beweging')).toBe('Eettafel VS');
    // a list that always said Home Assistant's name (the scenes) says it until asked
    const friendly = (id: string): string => `friendly ${id}`;
    expect(home().entityLabel('scene.eetkamer_diner', friendly)).toBe(
      'friendly scene.eetkamer_diner',
    );
    expect(home('entity').entityLabel('scene.eetkamer_diner', friendly)).toBe('Diner');
  });

  it('names a card only where that improves on what the card says by itself', () => {
    expect(home('entity').named('binary_sensor.eettafel_vs_beweging')).toEqual({
      name: 'Beweging',
    });
    expect(home('entity').named('binary_sensor.voordeur')).toEqual({});
    expect(home('full').named('binary_sensor.eettafel_vs_beweging')).toEqual({});
  });
});
