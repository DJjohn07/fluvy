import { climateAttribute, holdsSomething, type AreaRegistryEntry } from '@fluvy/core';
import { applianceSections } from './appliances.js';
import {
  byArea,
  capped,
  each,
  foldAt,
  moreAfter,
  moreKeys,
  NO_LIST,
  type Capped,
  type ListSpec,
} from './caps.js';
import { arranged, listed, part } from './edit.js';
import type { HomeRegistry } from './home-registry.js';
import {
  applianceTiles,
  cardNames,
  coverTiles,
  entityRows,
  flowed,
  full,
  headed,
  heading,
  lightGroups,
  lightTiles,
  namedEntries,
  readoutsCards,
  scenesCap,
  scenesCard,
  section,
  thermostat,
  tileRows,
  when,
} from './layout.js';
import type { CapKey, Card, Section, StrategyContext, View, ViewSpec } from './types.js';

/*
 * The rooms: a view of every room of the house (its card, grouped by floor when there are floors), and a subview
 * per room with everything it shows, every device its card counts among it — its scenes first, its thermostats,
 * lights, covers, gates, fans, media, plugs, readings, openings and cameras, the rest of it as rows, its automations on
 * a card of their own, and its appliances across under them. Every card stands in a part of its view (#170): a room's
 * card `room:<area id>`, a floor's heading `floor:<floor id>` (`other` over the rooms on no floor), a room's lists by
 * their own names. Where a dashboard asks (1.22, #202), a room is a tab of it at its page's path, under no way back,
 * whole or kept to some of its parts.
 */

/** The areas a dashboard shows: those with something to show, by the room card's own rule, floor by floor. */
export function roomsOf(home: HomeRegistry): AreaRegistryEntry[] {
  return home.areas.filter((area) => holdsSomething(home.contents(area.area_id)));
}

const roomPath = (base: string, area: AreaRegistryEntry): string => `${base}/room-${area.area_id}`;

/**
 * A room's lights where the house counts a lamp on a plug among them (`home.lights`), for its card's row and round:
 * the card's own are its `light.*` alone.
 */
function roomLights(home: HomeRegistry, areaId: string): { lights?: string[] } {
  const { lights } = roomParts(home, areaId);
  return lights.some((id) => !id.startsWith('light.')) ? { lights: [...lights] } : {};
}

/**
 * A room's card: its page as its path, the dashboard's style — its photo's own (#159) as the dashboard asks of every
 * room, then of this one, and its climate row saying what its thermostat is doing where the dashboard asks (#185) —
 * what the dashboard tunes it to hold (`rooms`), and its lights where a lamp on a plug is one.
 */
export const roomCard = (ctx: StrategyContext, area: AreaRegistryEntry): Card => ({
  type: 'custom:fluvy-room-card',
  area: area.area_id,
  path: roomPath(ctx.base, area),
  ...(ctx.style.room ? { variant: ctx.style.room } : {}),
  ...(ctx.style.doing ? { show_action: true } : {}),
  ...ctx.style.roomLook,
  ...ctx.home.look(area.area_id),
  ...ctx.home.tuning(area.area_id),
  ...roomLights(ctx.home, area.area_id),
  grid_options: { columns: 12 },
});

/** A room's card as a part of its view. */
export const roomPart = (
  ctx: StrategyContext,
  area: AreaRegistryEntry,
  card = roomCard(ctx, area),
) => part(ctx, `room:${area.area_id}`, [card]);

/** The Rooms view: a card a room; headed by floor when the house has more than one. */
export function roomsView(ctx: StrategyContext): Section[] {
  const { home, t, base } = ctx;
  const rooms = roomsOf(home);
  const floors = home.floors.filter((floor) =>
    rooms.some((room) => room.floor_id === floor.floor_id),
  );
  if (floors.length < 2)
    return flowed(
      ctx,
      rooms.map((area) => roomPart(ctx, area)),
    );
  const unplaced = rooms.filter(
    (room) => !floors.some((floor) => floor.floor_id === room.floor_id),
  );
  /** A heading and the rooms under it: the heading rides with the first of them it still shows. */
  const under = (id: string, head: Card, areas: readonly AreaRegistryEntry[]): Card[][] => {
    const top = part(ctx, id, [head]);
    const [first = [], ...rest] = areas
      .map((area) => roomPart(ctx, area))
      .filter((cards) => cards.length);
    return [[...top, ...first], ...rest];
  };
  return flowed(ctx, [
    ...floors.flatMap((floor) =>
      under(
        `floor:${floor.floor_id}`,
        heading(floor.name, floor.icon ?? 'fluvy:home', [], `${base}/rooms`),
        rooms.filter((room) => room.floor_id === floor.floor_id),
      ),
    ),
    ...(unplaced.length
      ? under('other', heading(t('strategy.rooms'), 'fluvy:home', [], `${base}/rooms`), unplaced)
      : []),
  ]);
}

/** Where a room's heading leads back to, and what it says ("All rooms", or the wall's home). */
export interface RoomBack {
  readonly path: string;
  readonly title: string;
}

/**
 * What a room holds, each entity it shows (`areaContents`: the room card's own rule, as the dashboard tunes it) in one
 * part of its page (#76): every device its card counts is on it, and every reading, sensor and control its area shows
 * besides (#95).
 */
export interface RoomParts {
  readonly thermostats: readonly string[];
  readonly lights: readonly string[];
  /** Blinds, curtains, awnings. */
  readonly covers: readonly string[];
  /** Garage doors and gates. */
  readonly gates: readonly string[];
  readonly fans: readonly string[];
  readonly players: readonly string[];
  /** The plugs' tiles. */
  readonly appliances: readonly string[];
  /** Its temperatures and humidities. */
  readonly readings: readonly string[];
  /** Doors, windows, motion, leaks, smoke and gas. */
  readonly openings: readonly string[];
  readonly cameras: readonly string[];
  /** Its scenes, on a Scenes card of their own (#172): never a device. */
  readonly scenes: readonly string[];
  /** Its automations, on an Automations card of their own (#118): never a device. */
  readonly automations: readonly string[];
  /** The appliances drawn whole across the page (their devices). */
  readonly devices: readonly string[];
  /** Everything else, as rows. */
  readonly rest: readonly string[];
  /** What the parts' cards show of the room besides: an appliance's own entities, a plug's power and energy. */
  readonly within: readonly string[];
}

/** A room's parts, each in the house's order. */
export function roomParts(home: HomeRegistry, areaId: string): RoomParts {
  const shown = home.contents(areaId).entities;
  const has = new Set(shown);
  const of = (ids: readonly string[]): string[] => ids.filter((id) => has.has(id));
  const devices = home.applianceDevices.filter((device) => home.deviceArea(device) === areaId);
  const appliances = of(home.applianceTiles);
  const parts = {
    thermostats: of(home.climate),
    lights: of(home.lights),
    covers: of(home.covers),
    gates: of(home.gateways),
    fans: of(home.fans),
    players: of(home.players),
    appliances,
    readings: of([...home.temperatures, ...home.humidities]),
    openings: of(home.openings),
    cameras: of(home.cameras),
    scenes: of(home.scenes),
    automations: of(home.automations),
  };
  const drawn = new Set(Object.values(parts).flat());
  const whole = new Set(devices);
  const within = new Set([
    ...shown.filter((id) => whole.has(home.deviceOf(id) ?? '')),
    ...appliances.flatMap((id) => home.readoutsOf(id)),
  ]);
  return {
    ...parts,
    devices,
    rest: shown.filter((id) => !drawn.has(id) && !within.has(id)),
    within: [...within].filter((id) => has.has(id) && !drawn.has(id)),
  };
}

/**
 * One room: everything it holds, in the home view's reading order, under a way back to where it was opened from (a
 * tab is opened from nowhere: none); each list at the house's cap, with its "N more" row. `only` keeps it to some of
 * its parts, by their ids (the Lights dashboard's room is its scenes and its lights): the others are no parts of the
 * view, and gather no list on it.
 */
export function roomSections(
  ctx: StrategyContext,
  area: AreaRegistryEntry,
  back: RoomBack | undefined,
  columns = 3,
  only?: readonly CapKey[],
): Section[] {
  const { home, t } = ctx;
  const parts = roomParts(home, area.area_id);
  const holds = (key: CapKey): boolean => !only || only.includes(key);
  /** A list of the room at its cap, where the view holds it. */
  const list = (
    spec: ListSpec,
    items: readonly string[],
    every: (items: readonly string[]) => readonly (readonly Card[])[],
  ): Capped => (holds(spec.key) ? capped(ctx, spec, items, every) : NO_LIST);
  /** The cards of one part of the room, where the view holds it. */
  const own = <T extends Card | readonly Card[]>(key: CapKey, pieces: readonly T[]): T[] =>
    holds(key) ? part(ctx, key, pieces) : [];
  const found = home.contents(area.area_id).climate;
  // the room's own readings, else the sensors its area names (a thermostat's or an appliance's reading is its card's)
  const named = (['temperature', 'humidity'] as const).flatMap((kind) => {
    const id = found[kind];
    return id && !climateAttribute(id, kind) && !home.ofAppliance(id) ? [id] : [];
  });
  const gateName = cardNames(home, parts.gates);
  const fanName = cardNames(home, parts.fans);
  const playerName = cardNames(home, parts.players);
  const gate = (id: string): Card => full('cover', { entity: id, ...gateName(id) });
  const fan = (id: string): Card => full('fan', { entity: id, ...fanName(id) });
  const player = (id: string): Card => full('media', { entity: id, ...playerName(id) });
  const camera = (id: string): Card => full('camera', { entity: id });
  const rows = (title: string, ids: readonly string[], extra: Record<string, unknown> = {}): Card =>
    full('entities', { title, rows: entityRows(home, ids), ...extra });
  const thermostats = list(
    { key: 'thermostats', title: 'strategy.thermostats', icon: 'fluvy:thermo' },
    parts.thermostats,
    each((id) => thermostat(id, ctx.style)),
  );
  const lights = list(
    { key: 'lights', title: 'room.lights', icon: 'fluvy:bulb' },
    parts.lights,
    (ids) => lightGroups(ctx, ids),
  );
  const covers = list(
    { key: 'covers', title: 'room.covers', icon: 'fluvy:blinds' },
    parts.covers,
    (ids) => [[coverTiles(home, ids)]],
  );
  const gates = list(
    { key: 'gates', title: 'strategy.gates', icon: 'fluvy:door' },
    parts.gates,
    each(gate),
  );
  const fans = list({ key: 'fans', title: 'room.fans', icon: 'fluvy:fan' }, parts.fans, each(fan));
  const players = list(
    { key: 'media', title: 'room.media', icon: 'fluvy:speaker' },
    parts.players,
    each(player),
  );
  const plugs = list(
    { key: 'appliances', title: 'strategy.appliances', icon: 'fluvy:plug' },
    parts.appliances,
    (ids) => tileRows(applianceTiles(home, ids, ctx.style)),
  );
  // every reading on the room's page is the room's: each is named by what it measures, as the room card names its
  // climate, where it alone measures it (two thermometers keep their own names)
  const measured = parts.readings.length ? parts.readings : named;
  const kindOf = (id: string): 'temperature' | 'humidity' =>
    id === found.humidity || home.humidities.includes(id) ? 'humidity' : 'temperature';
  const measureName = (id: string): string =>
    measured.filter((other) => kindOf(other) === kindOf(id)).length > 1
      ? home.displayName(id)
      : t(`room.${kindOf(id)}`);
  const readings = list(
    { key: 'readings', title: 'strategy.readings', icon: 'fluvy:thermo' },
    measured,
    (ids) => readoutsCards(home, ids, {}, measureName).map((card) => [card]),
  );
  const cameras = list(
    { key: 'cameras', title: 'strategy.cameras', icon: 'fluvy:camera' },
    parts.cameras,
    each(camera),
  );
  const scenes = list(
    { key: 'scenes', title: 'strategy.scenes', icon: 'fluvy:sparkle', ...scenesCap(ctx.style) },
    parts.scenes,
    (ids) => [[scenesCard(ctx, t('strategy.scenes'), ids, { room: area.name })]],
  );
  const rest = list(
    { key: 'devices', title: 'strategy.devices', icon: 'fluvy:devices' },
    parts.rest,
    (ids) => byArea(ctx, ids, t('strategy.devices'), (title, own) => [rows(title, own)]),
  );
  const openings = holds('openings') ? listed(ctx, 'openings', parts.openings) : [];
  const automations = holds('automations') ? listed(ctx, 'automations', parts.automations) : [];
  const sections = flowed(
    ctx,
    [
      ...when(back, (to) => [part(ctx, 'back', [heading(to.title, 'fluvy:home', [], to.path)])]),
      // its scenes first, a tap each, as its card's quick actions are read before its devices (#172)
      ...own(
        'scenes',
        when(scenes.shown.length, () =>
          moreAfter(
            [[scenesCard(ctx, t('strategy.scenes'), scenes.shown, { room: area.name })]],
            scenes,
          ),
        ),
      ),
      ...own(
        'thermostats',
        moreAfter(
          thermostats.shown.map((id) => [thermostat(id, ctx.style)]),
          thermostats,
        ),
      ),
      ...own(
        'lights',
        when(lights.shown.length, () =>
          moreAfter(
            headed(
              heading(t('room.lights'), 'fluvy:bulb', lights.all),
              tileRows(lightTiles(home, lights.shown, ctx.style)),
            ),
            lights,
          ),
        ),
      ),
      ...own(
        'covers',
        when(covers.shown.length, () =>
          moreAfter(
            [
              [
                heading(t('room.covers'), 'fluvy:blinds', covers.all),
                coverTiles(home, covers.shown),
              ],
            ],
            covers,
          ),
        ),
      ),
      // a garage door or a gate as a cover, as the security view draws it
      ...own(
        'gates',
        moreAfter(
          gates.shown.map((id) => [gate(id)]),
          gates,
        ),
      ),
      ...own(
        'fans',
        moreAfter(
          fans.shown.map((id) => [fan(id)]),
          fans,
        ),
      ),
      ...own(
        'media',
        moreAfter(
          players.shown.map((id) => [player(id)]),
          players,
        ),
      ),
      ...own(
        'appliances',
        when(plugs.shown.length, () =>
          moreAfter(
            headed(
              heading(t('strategy.appliances'), 'fluvy:plug', plugs.all),
              tileRows(applianceTiles(home, plugs.shown, ctx.style)),
            ),
            plugs,
          ),
        ),
      ),
      ...own(
        'readings',
        moreAfter(
          readoutsCards(home, readings.shown, {}, measureName).map((card) => [card]),
          readings,
        ),
      ),
      // the openings and the safety sensors on one card scoped to the room, which folds them itself at their cap
      ...own(
        'openings',
        when(openings.length, () => [
          [
            full('openings', {
              title: t('strategy.sensors'),
              entities: namedEntries(home, openings),
              ...foldAt(ctx, 'openings', openings),
            }),
          ],
        ]),
      ),
      ...own(
        'cameras',
        moreAfter(
          cameras.shown.map((id) => [camera(id)]),
          cameras,
        ),
      ),
      ...own(
        'devices',
        when(rest.shown.length, () => [[rows(t('strategy.devices'), rest.shown, moreKeys(rest))]]),
      ),
      // its automations on their own card, each with its switch, its last and next run (the card folds them at their
      // cap); no `+`: a schedule added there would be of no room, and never on this card
      ...own(
        'automations',
        when(automations.length, () => [
          [
            full('automations', {
              title: t('strategy.automations'),
              entities: [...automations],
              show_add: false,
              ...foldAt(ctx, 'automations', automations),
            }),
          ],
        ]),
      ),
    ],
    [],
    columns,
  );
  return [
    ...(sections.length || !back
      ? sections
      : [section(heading(back.title, 'fluvy:home', [], back.path))]),
    // the appliances across the page are the whole room's
    ...(only ? [] : applianceSections(ctx, parts.devices, columns)),
  ];
}

/**
 * A room as a tab of its dashboard (1.22, #202), at its page's own path (`room-<area id>`): its card's link, its
 * parts' ids and what another view shows of it (`also`) are the page's. Whole, it always stands, as its page does;
 * kept to some of its parts (`only`), a room with none of them is no tab.
 */
export const roomAsTab = (
  area: AreaRegistryEntry,
  columns: number,
  only?: readonly CapKey[],
): ViewSpec => ({
  key: `room-${area.area_id}`,
  icon: area.icon ?? 'fluvy:home',
  title: 'strategy.rooms',
  name: area.name,
  build: (ctx) => roomSections(ctx, area, undefined, columns, only),
  ...(only ? {} : { when: () => true }),
});

/** The subview of a room. */
export function roomView(
  ctx: StrategyContext,
  area: AreaRegistryEntry,
  columns: number,
  back: RoomBack,
): View {
  return {
    title: area.name,
    icon: area.icon ?? 'fluvy:home',
    path: `room-${area.area_id}`,
    type: 'sections',
    max_columns: columns,
    subview: true,
    back_path: back.path,
    sections: arranged(ctx.more, roomSections(ctx, area, back, columns)),
  };
}
