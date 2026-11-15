// @vitest-environment happy-dom
import { setRoomOrder, type HomeAssistant } from '@fluvy/core';
import { DEMO_ROOMS, demoHass, type DemoEntity } from '@fluvy/demo-home';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
// the cards register their heights with core: the strategy lays columns out with them
import { familiesDefined } from '../index.js';
import { generate, generateWith } from './generate.js';
import { strategyOptions, templateById, TEMPLATES } from './templates.js';
import type { Card, FluvyStrategyConfig, MoreHost, TemplateId, View } from './types.js';

// the families' chunks are fetched as the module loads: they land before the file's environment goes
afterAll(() => familiesDefined);

/*
 * A room as a tab (1.22, #202): the Rooms dashboard's rooms as tabs where it is asked (`rooms_as: tabs`), each at its
 * page's path with its page's parts and no way back, one hidden among the tabs still a page. Without the option, a
 * house is 1.21's.
 */

const entity = (
  id: string,
  name: string,
  area?: string,
  attributes: Record<string, unknown> = {},
  state = 'off',
): DemoEntity => ({
  id,
  state,
  attributes: { friendly_name: name, ...attributes },
  ...(area ? { registry: { area_id: area } } : {}),
});
const ONOFF = { supported_color_modes: ['onoff'] };
const reading = (id: string, name: string, area: string, kind: 'temperature' | 'humidity') =>
  entity(
    id,
    name,
    area,
    { device_class: kind, unit_of_measurement: kind === 'humidity' ? '%' : '°C' },
    kind === 'humidity' ? '48' : '21.5',
  );

/**
 * The demo home with what a room's tab shows: a kitchen of eight lights and three scenes, a living room with two
 * scenes, a thermostat and a fan, a bedroom with a thermostat beside its thermometer, a hallway that holds a cover
 * alone, and a scene in no room. Its rooms: the living room and the kitchen downstairs, the bedroom upstairs, the
 * garden and the hallway on no floor.
 */
const MORE: readonly DemoEntity[] = [
  ...DEMO_ROOMS,
  ...Array.from({ length: 7 }, (_, at) =>
    entity(`light.kitchen_spot_${at + 1}`, `Kitchen spot ${at + 1}`, 'kitchen', ONOFF),
  ),
  entity('scene.kitchen_cooking', 'Cooking', 'kitchen'),
  entity('scene.kitchen_dinner', 'Dinner', 'kitchen'),
  entity('scene.kitchen_evening', 'Evening', 'kitchen'),
  entity('scene.living_relax', 'Relax', 'living_room'),
  entity('scene.living_film', 'Film night', 'living_room'),
  entity('scene.good_night', 'Good night'),
  entity('climate.living_room', 'Living room', 'living_room', { temperature: 21 }, 'heat'),
  entity('fan.living_room', 'Ceiling fan', 'living_room'),
  entity('climate.bedroom', 'Bedroom', 'bedroom', { temperature: 18 }, 'heat'),
  reading(
    'sensor.living_room_temperature',
    'Living room temperature',
    'living_room',
    'temperature',
  ),
  reading('sensor.living_room_humidity', 'Living room humidity', 'living_room', 'humidity'),
  entity('cover.hallway_blind', 'Hallway blind', 'hallway', { device_class: 'blind' }, 'open'),
];
const house = (more: readonly DemoEntity[] = MORE): HomeAssistant => {
  const hass = demoHass({ more }) as unknown as HomeAssistant;
  hass.areas['hallway'] = { area_id: 'hallway', name: 'Hallway' } as never;
  return hass;
};

type Options = Partial<FluvyStrategyConfig>;
/** A template's dashboard on the house, with the views it was built on (their parts). */
const built = async (id: TemplateId, options: Options = {}, hass = house()) => {
  const template = templateById(id);
  const hosts: MoreHost[] = [];
  const { views } = await generateWith(
    template,
    { type: template.type, ...options },
    hass,
    `/${template.url}`,
    hosts,
  );
  return { views, hosts };
};
const viewOf = (views: readonly View[], path: string): View =>
  views.find((view) => view.path === path) as View;
const tabsOf = (views: readonly View[]): View[] => views.filter((view) => !view.subview);
const cardsOf = (view: View): Card[] => view.sections.flatMap((section) => section.cards);
const kind = (card: Card): string => card.type.replace('custom:fluvy-', '').replace('-card', '');
const ofKind = (view: View, name: string): Card[] =>
  cardsOf(view).filter((card) => kind(card) === name);
/** A view's cards but the greeting, in no order: what it holds, however its columns were cut. */
const held = (view: View): string[] =>
  cardsOf(view)
    .filter((card) => kind(card) !== 'hello')
    .map((card) => JSON.stringify(card))
    .sort();
/** The ids of the parts a view was built of that draw something. */
const partsOf = (hosts: readonly MoreHost[], path: string): string[] =>
  (hosts.find((host) => host.path === path)?.parts ?? [])
    .filter((part) => part.cards.length)
    .map((part) => part.id);

describe('the Rooms dashboard with its rooms as tabs (#202)', () => {
  afterEach(() => setRoomOrder({ sort: 'auto', order: [] }));

  it('is 1.21’s until it is asked: a tab a floor, a page a room under its way back', async () => {
    const plain = await generate({ type: 'custom:fluvy-rooms' }, house());
    expect(await generate({ type: 'custom:fluvy-rooms', rooms_as: 'pages' }, house())).toEqual(
      plain,
    );
    expect(tabsOf(plain.views).map((view) => view.path)).toEqual([
      'floor-ground',
      'floor-upstairs',
      'rooms',
    ]);
    const kitchen = viewOf(plain.views, 'room-kitchen');
    expect(kitchen.subview).toBe(true);
    expect(cardsOf(kitchen)[1]).toEqual({
      type: 'custom:fluvy-heading-card',
      title: 'All rooms',
      icon: 'fluvy:home',
      path: '/fluvy-home/floor-ground',
    });
  });

  it('opens with "All rooms", every room’s card under its floor’s heading, then a tab a room', async () => {
    const { views } = await built('rooms', { rooms_as: 'tabs' });
    const tabs = tabsOf(views);
    // the rooms floor by floor, each floor's A to Z, those on no floor last: the house's order while it names none
    expect(tabs.map((view) => [view.path, view.title, view.icon])).toEqual([
      ['rooms', 'All rooms', 'fluvy:rooms'],
      ['room-kitchen', 'Kitchen', 'mdi:silverware-fork-knife'],
      ['room-living_room', 'Living room', 'mdi:sofa'],
      ['room-bedroom', 'Bedroom', 'mdi:bed'],
      ['room-garden', 'Garden', 'fluvy:home'],
      ['room-hallway', 'Hallway', 'fluvy:home'],
    ]);
    // no room is a page any more: what is left behind the tabs are the lists' own
    expect(views.filter((view) => view.subview).map((view) => view.path)).toEqual([
      'room-kitchen-lights',
    ]);
    const all = viewOf(views, 'rooms');
    expect(
      cardsOf(all)
        .filter((card) => ['heading', 'room'].includes(kind(card)))
        .map((card) => String(card['title'] ?? card['area'])),
    ).toEqual([
      'Ground floor',
      'kitchen',
      'living_room',
      'Upstairs',
      'bedroom',
      'Rooms',
      'garden',
      'hallway',
    ]);
    // each card leads to its room's tab, the path its page had
    expect(ofKind(all, 'room').map((card) => card['path'])).toEqual([
      '/fluvy-rooms/room-kitchen',
      '/fluvy-rooms/room-living_room',
      '/fluvy-rooms/room-bedroom',
      '/fluvy-rooms/room-garden',
      '/fluvy-rooms/room-hallway',
    ]);
  });

  it('draws a room’s tab as its page without the way back, part for part under the page’s ids', async () => {
    const pages = await built('rooms');
    const tabs = await built('rooms', { rooms_as: 'tabs' });
    for (const room of ['kitchen', 'living_room', 'bedroom', 'garden', 'hallway']) {
      const path = `room-${room}`;
      const page = viewOf(pages.views, path);
      const tab = viewOf(tabs.views, path);
      expect(tab.subview, path).toBeUndefined();
      expect(tab.back_path, path).toBeUndefined();
      // the page's first card under the greeting is its way back; the tab holds every other one
      const back = cardsOf(page)[1] as Card;
      expect(back['title'], path).toBe('All rooms');
      expect(held(tab), path).toEqual(held(page).filter((card) => card !== JSON.stringify(back)));
      expect(partsOf(tabs.hosts, path), path).toEqual(
        partsOf(pages.hosts, path).filter((id) => id !== 'back'),
      );
    }
    // the kitchen's parts, as its page names them
    expect(partsOf(tabs.hosts, 'room-kitchen')).toEqual(['scenes', 'lights']);
    expect(partsOf(tabs.hosts, 'room-living_room')).toEqual([
      'scenes',
      'thermostats',
      'lights',
      'fans',
      'readings',
    ]);
  });

  it('leads a list’s "N more" page back to its room’s tab', async () => {
    const { views } = await built('rooms', { rooms_as: 'tabs' });
    const more = cardsOf(viewOf(views, 'room-kitchen')).find((card) => card['more_path']);
    expect(more).toMatchObject({ more: 2, more_path: '/fluvy-rooms/room-kitchen-lights' });
    expect(viewOf(views, 'room-kitchen-lights')).toMatchObject({
      subview: true,
      back_path: '/fluvy-rooms/room-kitchen',
    });
  });

  it('stands the tabs in the house’s order of its rooms', async () => {
    setRoomOrder({ sort: 'auto', order: ['bedroom', 'hallway'] });
    const { views } = await built('rooms', { rooms_as: 'tabs' });
    expect(tabsOf(views).map((view) => view.path)).toEqual([
      'rooms',
      'room-bedroom',
      'room-hallway',
      'room-kitchen',
      'room-living_room',
      'room-garden',
    ]);
  });

  it('keeps a room hidden among the tabs as a page, back to "All rooms": no card leads nowhere', async () => {
    const { views, hosts } = await built('rooms', {
      rooms_as: 'tabs',
      edit: { views: { 'room-bedroom': { hidden: true }, 'room-garden': { order: 1 } } },
    });
    // the garden moved first among the rooms; the bedroom is no tab
    expect(tabsOf(views).map((view) => view.path)).toEqual([
      'rooms',
      'room-garden',
      'room-kitchen',
      'room-living_room',
      'room-hallway',
    ]);
    const bedroom = viewOf(views, 'room-bedroom');
    expect(bedroom).toMatchObject({ subview: true, back_path: '/fluvy-rooms/rooms' });
    expect(cardsOf(bedroom)[1]).toEqual({
      type: 'custom:fluvy-heading-card',
      title: 'All rooms',
      icon: 'fluvy:home',
      path: '/fluvy-rooms/rooms',
    });
    expect(partsOf(hosts, 'room-bedroom')[0]).toBe('back');
    // its card still stands on "All rooms" and still leads to it
    expect(
      ofKind(viewOf(views, 'rooms'), 'room').find((card) => card['area'] === 'bedroom')?.['path'],
    ).toBe('/fluvy-rooms/room-bedroom');
    // every path a room's card names is a view of the dashboard
    const paths = new Set(views.map((view) => `/fluvy-rooms/${view.path}`));
    for (const card of ofKind(viewOf(views, 'rooms'), 'room'))
      expect(paths.has(String(card['path'])), String(card['area'])).toBe(true);
  });

  it('takes what a person changed on a room’s page, and shows a room’s part on another tab', async () => {
    const edit = {
      views: { rooms: { also: ['room-kitchen/scenes'] } },
      cards: {
        'room-kitchen/lights': { hidden: true },
        'rooms/also:room-kitchen/scenes': { options: { title: 'Kitchen' } },
      },
      entities: { 'room-living_room/scenes': { drop: ['scene.living_film'] } },
    };
    const { views } = await built('rooms', { rooms_as: 'tabs', edit });
    const kitchen = viewOf(views, 'room-kitchen');
    expect(ofKind(kitchen, 'tile')).toEqual([]);
    expect(ofKind(kitchen, 'scenes')).toHaveLength(1);
    expect(ofKind(viewOf(views, 'room-living_room'), 'scenes')[0]?.['scenes']).toEqual([
      'scene.living_relax',
    ]);
    // the kitchen's scenes on "All rooms" as well, under the title they were given there
    expect(ofKind(viewOf(views, 'rooms'), 'scenes')[0]).toMatchObject({
      title: 'Kitchen',
      scenes: ['scene.kitchen_cooking', 'scene.kitchen_dinner', 'scene.kitchen_evening'],
    });
  });

  it('lists every tab as a chip under the greeting where the dashboard asks for them', async () => {
    const { views } = await built('rooms', { rooms_as: 'tabs', greeting_tabs: 'show' });
    const chips = cardsOf(viewOf(views, 'room-kitchen'))[1] as Card;
    expect((chips['chips'] as { label: string; path: string }[]).map((chip) => chip.path)).toEqual(
      tabsOf(views).map((view) => `/fluvy-rooms/${view.path}`),
    );
  });

  it('is an option of the Rooms dashboard alone, off until chosen, which a settings file carries', () => {
    expect(
      TEMPLATES.filter((template) =>
        template.options.some((option) => option.key === 'rooms_as'),
      ).map((template) => template.id),
    ).toEqual(['rooms']);
    const option = templateById('rooms').options.find((known) => known.key === 'rooms_as');
    // the first value is the default: the panel never writes it
    expect(option).toMatchObject({
      kind: 'choice',
      values: [{ value: 'pages' }, { value: 'tabs' }],
    });
    expect(strategyOptions({ rooms_as: 'tabs' }, templateById('rooms'))).toEqual({
      rooms_as: 'tabs',
    });
    expect(strategyOptions({ rooms_as: 'rail' }, templateById('rooms'))).toEqual({});
    expect(strategyOptions({ rooms_as: 'tabs' }, templateById('home'))).toEqual({});
  });
});
