import {
  actionRuns,
  entityName,
  formatNumber,
  isActiveState,
  isUsable,
  lightDefaults,
  localize,
  resolveEntity,
  stateText,
  textName,
  TOGGLE_DOMAINS,
  valueParts,
  type ActionConfig,
  type EntityName,
  type EntityView,
  type HomeAssistant,
} from '@fluvy/core';
import type { Tone } from '@fluvy/ui';
import { css, html, nothing, type TemplateResult } from 'lit';
import { statusToneOf } from '../shared/colour.js';
import { GATEWAYS, iconOf, toneFor } from '../shared/domain.js';
import type { TextRuler } from '../shared/fit.js';
import { DIMMABLE, lampsOf, lightLook, litColour, meanHex } from '../shared/light.js';
import { shorterForms } from '../shared/secondary.js';
import { levelRound, ROUND, ROUND_GAP, type LevelRound } from '../shared/round.js';
import type { RoomCardConfig } from './room-card.js';

/*
 * A room's quick actions (#113): rounds at the end of its head, its row or its picture, each one of the room's sets —
 * its lights, its blinds, its fans, its players — or an entity of the person's choosing, each saying its state where
 * asked (#205). Their own chunk, fetched with the families as the bundle starts: the room card draws them from its
 * first render in practice.
 */

/** The room's own sets a round may stand for, each by the domain its devices are of. */
const GROUPS = {
  lights: 'light',
  covers: 'cover',
  fans: 'fan',
  media: 'media_player',
} as const;
export type QuickGroup = keyof typeof GROUPS;
export const QUICK_GROUPS = Object.keys(GROUPS) as readonly QuickGroup[];

/** A set's word (its round's name) and glyph (where it holds more than one). */
const LOOKS = {
  lights: ['room.lights', 'bulb'],
  covers: ['room.covers', 'blinds'],
  fans: ['room.fans', 'fan'],
  media: ['room.media', 'speaker'],
} as const;

/** One round: one of the room's sets (`group`), or one entity; its own name, icon, colour and actions. */
export interface QuickAction {
  /** `lights`, `covers` (blinds, curtains, awnings: never a door or a gate), `fans`, `media`; `entity`: its own. */
  group?: QuickGroup | 'entity';
  /** The entity a round of its own acts on. */
  entity?: string;
  name?: EntityName;
  icon?: string;
  tone?: Tone;
  /** Its own colour while on (a Home Assistant colour name or `#rrggbb`). */
  color?: string;
  /** Default: on and off (a set: all of it; blinds: open, close, or stop while they move). */
  tap_action?: ActionConfig;
  /** Default: its details (a set of several: where the room opens). */
  hold_action?: ActionConfig;
  /** Default: none; where set, a tap waits a moment to tell it from one (#179). */
  double_tap_action?: ActionConfig;
  /** Its state beside or under its glyph (#205); default: the card's `show_quick_states`. */
  show_state?: boolean;
}

/** A config's entry as a round: a set's word, an entity's id, or an entry; anything else none. */
export function quickEntry(raw: unknown): QuickAction | null {
  if (typeof raw === 'string')
    return raw.includes('.') ? { group: 'entity', entity: raw } : { group: raw as QuickGroup };
  if (typeof raw !== 'object' || raw === null) return null;
  const entry = raw as QuickAction;
  return entry.group ? entry : { ...entry, group: 'entity' };
}

/** What a room asks for when it names no rounds: its lights, then its blinds. */
const DEFAULT: readonly QuickGroup[] = ['lights', 'covers'];

/** What the rounds reach of their card: its house, config and devices, its states as drawn, its calls, its colours. */
export interface QuickHost {
  readonly hass: HomeAssistant | undefined;
  readonly config?: RoomCardConfig | undefined;
  /** The room's devices as the card counts them. */
  readonly devices: readonly string[];
  /** The room's lights as the card counts them (`roomLights`): a lamp on a plug among them where it lists one. */
  readonly lights: readonly string[];
  /** A state as drawn: the one a tap expects until Home Assistant says it. */
  state(view: EntityView): string;
  expect(entityId: string, state: string): void;
  call(domain: string, service: string, data: Record<string, unknown>): void;
  run(action: ActionConfig, entityId: string | undefined): void;
  /** A tap that waits for a second where a double tap is set (the card's `tapper`). */
  tapper(
    of: unknown,
    at: string,
    tap: (() => void) | undefined,
    double: (() => void) | undefined,
  ): (() => void) | undefined;
  /** A colour as the card's sheet gives it (`data-accent`). */
  accent(colour: unknown): string | undefined;
  /** Where the room opens, where it opens anywhere. */
  readonly destination: string | undefined;
  /** The card's ruler: the pill a state's words take, laid out in the card's own classes. */
  readonly ruler: Pick<TextRuler, 'pill'>;
  /** The card's root, which wears the pills' sheet once one is drawn. */
  readonly root: Node | undefined;
}

/** The rounds drawn in the room the card gives them, and what they take of its line: their width and 12 before. */
export interface QuickRounds {
  readonly taken: number;
  readonly template: TemplateResult | typeof nothing;
}

/** What a room's sets are drawn from: its house, its devices and its lights as the card counts them. */
export type QuickRoom = Pick<QuickHost, 'hass' | 'devices' | 'lights'>;

/**
 * A set's entities in a room: its lights (a lamp on a plug among them where the card lists one), else its devices of
 * the set's domain (its blinds, never its doors and gates).
 */
function membersOf({ hass, devices, lights }: QuickRoom, group: QuickGroup): readonly string[] {
  return group === 'lights'
    ? lights
    : devices.filter(
        (id) =>
          id.startsWith(`${GROUPS[group]}.`) &&
          (group !== 'covers' || !GATEWAYS.has(resolveEntity(hass, id).deviceClass)),
      );
}

/** The sets a room's rounds stand for when the card names none: its lights, then its blinds, where it has them. */
export const defaultGroups = (room: QuickRoom): QuickGroup[] =>
  DEFAULT.filter((group) => membersOf(room, group).length);

/** The rounds asked for (`quick_actions`), else the room's lights and blinds; a set the room does not hold has none. */
function quickActions(host: QuickHost): QuickAction[] {
  const asked = host.config?.quick_actions;
  return (Array.isArray(asked) ? asked : DEFAULT)
    .map(quickEntry)
    .filter(
      (item): item is QuickAction =>
        item !== null &&
        (item.group === 'entity'
          ? Boolean(item.entity)
          : item.group !== undefined &&
            Object.hasOwn(GROUPS, item.group) &&
            membersOf(host, item.group).length > 0),
    );
}

/**
 * Where an entity stands, 0–100, where it says: a light's brightness (where it dims), a blind's position, a fan's
 * speed, a player's volume.
 */
function levelIn(view: EntityView): number | undefined {
  const raw =
    view.domain === 'light'
      ? (view.attr<string[]>('supported_color_modes') ?? []).some((mode) => DIMMABLE.has(mode))
        ? (view.attr<number>('brightness') ?? NaN) / 2.55
        : NaN
      : view.domain === 'cover'
        ? view.attr<number>('current_position')
        : view.domain === 'fan'
          ? view.attr<number>('percentage')
          : view.domain === 'media_player'
            ? (view.attr<number>('volume_level') ?? NaN) * 100
            : NaN;
  return typeof raw === 'number' && Number.isFinite(raw)
    ? Math.min(100, Math.max(0, raw))
    : undefined;
}

/** Where an entity stands while on: its level, 100 where it says none. */
const levelOf = (view: EntityView): number => levelIn(view) ?? 100;

/** The domains whose ring is a level a person reads as one: a light's brightness, a blind's position, a fan's speed. */
const LEVELLED: ReadonlySet<string> = new Set(['light', 'cover', 'fan']);

/**
 * What a round says of its state (#205), its forms longest first: the level its ring draws (`level`, where that is
 * one a person reads); else its state as Home Assistant says it, as it is drawn — a reading with its unit in the
 * house's decimals, then a temperature with its degree alone ("21.5 °C", "21.5°") and a large count in short words, a
 * moment as long ago as it was, a word ("Open", "Off") — of the first of a set that is on; "—" where none of it can
 * be read.
 */
function saidOf(
  host: QuickHost,
  views: readonly EntityView[],
  level: number | undefined,
): readonly string[] {
  const { hass } = host;
  const read = views.filter((view) => view.status === 'ok');
  const view = read.find((one) => isActiveState(one.domain, host.state(one))) ?? read[0];
  if (!view) return ['—'];
  if (level !== undefined) return [`${formatNumber(hass, level, { digits: 0 })} %`];
  if (view.number === null) {
    const words = stateText(hass, view, host.state(view));
    return [words, ...shorterForms(hass, view, words)];
  }
  const { value, unit } = valueParts(hass, view);
  const text = unit ? `${value} ${unit}` : value;
  // a figure keeps its unit in every form: the degree alone, a count's short words with the unit it was written in
  return unit.startsWith('°')
    ? [text, `${value}°`]
    : [text, ...shorterForms(hass, view, text).filter((form) => unit && form.endsWith(` ${unit}`))];
}

/** States a blind moves in: a tap then stops it. */
const MOVING: ReadonlySet<string> = new Set(['opening', 'closing']);

/* the `supported_features` of a blind and a player that say which service each takes */
const COVER_OPEN = 1;
const COVER_CLOSE = 2;
const COVER_STOP = 8;
const COVER_OPEN_TILT = 16;
const COVER_CLOSE_TILT = 32;
const COVER_STOP_TILT = 64;
const MEDIA_PAUSE = 1;
const MEDIA_TURN_ON = 128;
const MEDIA_TURN_OFF = 256;
const MEDIA_STOP = 4096;
const MEDIA_PLAY = 16384;

/** The services a move may be, best first, each with the feature a member needs for it (0: every member takes it). */
type Ways = readonly (readonly [service: string, feature: number])[];

/** A blind stops, closes and opens itself, else (one that only tilts) its slats. */
const STOPS: Ways = [
  ['stop_cover', COVER_STOP],
  ['stop_cover_tilt', COVER_STOP_TILT],
];
const CLOSES: Ways = [
  ['close_cover', COVER_CLOSE],
  ['close_cover_tilt', COVER_CLOSE_TILT],
];
const OPENS: Ways = [
  ['open_cover', COVER_OPEN],
  ['open_cover_tilt', COVER_OPEN_TILT],
];
/** A player that plays pauses, else stops (Home Assistant's own play button), else goes off. */
const PAUSES: Ways = [
  ['media_pause', MEDIA_PAUSE],
  ['media_stop', MEDIA_STOP],
  ['turn_off', MEDIA_TURN_OFF],
];
const PLAYS: Ways = [['media_play', MEDIA_PLAY]];
const WAKES: Ways = [['turn_on', MEDIA_TURN_ON]];

/** One call of a round's: a service of a domain and the members of that domain that take it. */
interface Call {
  readonly domain: string;
  readonly service: string;
  readonly ids: readonly string[];
}

/**
 * The calls that move `views`, one a service in the order of `ways` and a domain (a lamp on a plug among lights is a
 * switch, which a light's call never reaches): each member by the first of them it supports, one that supports none
 * left out (Home Assistant refuses a whole call one of its entities cannot take).
 */
function callsOf(views: readonly EntityView[], ways: Ways): Call[] {
  const way = (view: EntityView): string | undefined =>
    ways.find(([, feature]) => !feature || view.supports(feature))?.[0];
  const domains = [...new Set(views.map((view) => view.domain))];
  return ways
    .flatMap(([service]) =>
      domains.map((domain) => ({
        domain,
        service,
        ids: views
          .filter((view) => view.domain === domain && way(view) === service)
          .map((view) => view.id),
      })),
    )
    .filter((call) => call.ids.length > 0);
}

/** A round's on and off as it would go now: its calls (none: none of its members can), and the state they expect. */
interface Flip {
  readonly calls: readonly Call[];
  readonly expect?: string;
}

/**
 * A round's own on and off, for all of it at once: a set on goes off, a set off comes on; blinds that move stop, else
 * open ones close and closed ones open; players that play pause, else those on play and those off come on — each
 * member by what it takes (a blind that only tilts by its slats, a lamp on a plug as a switch), one call a service
 * and a domain.
 */
function flipOf(domain: string, views: readonly EntityView[], on: boolean): Flip {
  const usable = views.filter(isUsable);
  if (domain === 'cover') {
    const stops = callsOf(
      usable.filter((view) => MOVING.has(view.state)),
      STOPS,
    );
    if (stops.length) return { calls: stops };
    return on
      ? { calls: callsOf(usable, CLOSES), expect: 'closed' }
      : { calls: callsOf(usable, OPENS), expect: 'open' };
  }
  if (domain === 'media_player') {
    const playing = usable.filter((view) => view.state === 'playing');
    if (playing.length) return { calls: callsOf(playing, PAUSES) };
    const awake = usable.filter((view) => view.state !== 'off');
    return awake.length
      ? { calls: callsOf(awake, PLAYS), expect: 'playing' }
      : { calls: callsOf(usable, WAKES) };
  }
  return {
    calls: callsOf(usable, [[on ? 'turn_off' : 'turn_on', 0]]),
    expect: on ? 'off' : 'on',
  };
}

/** Every call of a round's at once, its members drawn as they will be. */
function perform(host: QuickHost, flip: Flip): void {
  for (const { domain, service, ids } of flip.calls) {
    if (flip.expect) for (const id of ids) host.expect(id, flip.expect);
    host.call(domain, service, { entity_id: [...ids] });
  }
}

/**
 * The rounds Home Assistant's dialog asks about, each by the very action handed to it: its yes hands that action back.
 * An action answered no is Home Assistant's to drop, and the question goes with it.
 */
const asked = new WeakMap<object, () => void>();
/** Whether the window hears the yes Home Assistant fires from its root: from the first question on, once. */
let hearing = false;

/**
 * Home Assistant's yes: its `fire-dom-event` comes back as `ll-custom`, from its root on 2026.9 (it bubbles to the
 * window, never through the card) and from the card that asked on later frontends (which hears it on itself, in the
 * page or drawn anew since); only the action it asked about moves its round, and only once.
 */
export function answered(event: Event): void {
  // any other `ll-custom` (a frontend integration's, a page's) is no question of the rounds'
  const action = (event as CustomEvent<object>).detail;
  const yes = asked.get(action);
  if (!yes) return;
  asked.delete(action);
  yes();
}

/**
 * Runs a round's on and off: every call at once; or, asked first (`confirmation`), once Home Assistant's own dialog
 * has its answer, nothing moving before. One call goes to it whole (its words, where the tap says none, name its
 * service); several go as one `fire-dom-event` it hands back once answered yes, so every member is asked about (a
 * blind that only tilts beside blinds that close as well), its words where the tap says none Home Assistant's sentence
 * naming the round ("Are you sure you want to run action "Blinds"?"), else the round's name.
 */
function runFlip(
  host: QuickHost,
  flip: Flip,
  confirmation: ActionConfig['confirmation'],
  name: string,
): void {
  if (!confirmation) return perform(host, flip);
  const [first, ...rest] = flip.calls;
  if (!first) return;
  if (!rest.length)
    return host.run(
      {
        action: 'perform-action',
        perform_action: `${first.domain}.${first.service}`,
        target: { entity_id: [...first.ids] },
        confirmation,
      },
      undefined,
    );
  const own = typeof confirmation === 'object' ? confirmation : {};
  const key = 'ui.panel.lovelace.cards.actions.action_confirmation';
  const said = host.hass?.localize?.(key, { action: name });
  const action: ActionConfig = {
    action: 'fire-dom-event',
    confirmation: { ...own, text: own.text ?? (said && said !== key ? said : name) },
  };
  asked.set(action, () => perform(host, flip));
  if (!hearing) {
    window.addEventListener('ll-custom', answered);
    hearing = true;
  }
  host.run(action, undefined);
}

/** The domains a round turns on and off itself (`flipOf`), all of a set at once; the rest by the house's toggle. */
const FLIPS: ReadonlySet<string> = new Set([
  'light',
  'switch',
  'fan',
  'cover',
  'media_player',
  'input_boolean',
  'humidifier',
]);

const MORE_INFO: ActionConfig = { action: 'more-info' };
const TOGGLE: ActionConfig = { action: 'toggle' };

/** A round as drawn, and its state's forms where it says it (longest first). */
type QuickRound = LevelRound & { readonly said?: readonly string[] | undefined };

/**
 * A round as drawn: its name and glyph (its set's, else its entity's), on while any of it is, its ring the level of
 * all of it (an off one at 0: the room's light as a share of all it could give, its blinds' mean position), its colour
 * (a set of lights in what is lit, as the room's lights' row; else its own, else its kind's), its tap (on and off; none
 * where none of it can, and then it is drawn as one that cannot), its hold (its details) and, where it says it (its
 * own `show_state`, else the card's `show_quick_states`), its state.
 */
function roundOf(host: QuickHost, item: QuickAction): QuickRound {
  const { hass, config } = host;
  const group = item.group === 'entity' ? undefined : item.group;
  const ids = group ? membersOf(host, group) : [item.entity ?? ''];
  const views = ids.map((id) => resolveEntity(hass, id));
  const first = views[0] ?? resolveEntity(hass, undefined);
  // the room's lights (a lamp on a plug among them), or a light of its own
  const light = group ? group === 'lights' : first.domain === 'light';
  const lit = (view: EntityView): boolean =>
    isUsable(view) && isActiveState(view.domain, host.state(view));
  // a set of lights counts each lamp once (a group in the room is its members)
  const lamps = light ? lampsOf(ids, hass).map((id) => resolveEntity(hass, id)) : views;
  const on = views.some(lit);
  const level =
    lamps.reduce((sum, view) => sum + (lit(view) ? levelOf(view) : 0), 0) / lamps.length;
  const glow =
    light && on && (config?.light_colors ?? lightDefaults().colors)
      ? group
        ? meanHex(lamps, config?.light_whites)
        : litColour(first, true, config?.light_whites, hass)
      : undefined;
  const [colour, tone] = light
    ? lightLook(item, config, glow)
    : [item.color, statusToneOf(item, toneFor(first))];
  const single = ids.length === 1 ? ids[0] : undefined;
  // what its actions are for: its own entity, else its one member; a set of several has none
  const own = item.entity ?? single;
  /**
   * An action of the round's, where it can run: a set of several's details are where the room opens, whose page lists
   * them as a group's own dialog lists its members (Home Assistant has no dialog for entities that are no group).
   */
  const runs = (asked: ActionConfig): (() => void) | undefined => {
    const action =
      asked.action === 'more-info' && !asked.entity && !own && host.destination
        ? { ...asked, action: 'navigate' as const, navigation_path: host.destination }
        : asked;
    return actionRuns(action, own) ? () => host.run(action, own) : undefined;
  };
  const tap = item.tap_action ?? (group || TOGGLE_DOMAINS.has(first.domain) ? TOGGLE : MORE_INFO);
  // its own on and off where its tap toggles it, asked first or not
  const flip =
    tap.action === 'toggle' && !tap.entity && FLIPS.has(first.domain)
      ? flipOf(first.domain, views, on)
      : undefined;
  const name = group
    ? (textName(item.name) ?? localize(hass, LOOKS[group][0]))
    : entityName(hass, first, item.name);
  const ring = on ? Math.max(1, Math.round(level)) : 0;
  // its state where it says it: the level its ring draws where a person reads one (a set of several lights, blinds or
  // fans; one that says its brightness, position or speed), else Home Assistant's words
  const says = item.show_state ?? config?.show_quick_states ?? false;
  const levelled =
    on &&
    (lamps.length > 1
      ? group !== 'media'
      : LEVELLED.has(first.domain) && levelIn(first) !== undefined);
  // a reading (never on) that names its own tone or colour wears it, drawn as lit
  const toned =
    says &&
    isUsable(first) &&
    !isActiveState(first.domain, 'on') &&
    Boolean(item.tone ?? item.color);
  return {
    name,
    glyph: item.icon ?? (group && !single ? LOOKS[group][1] : iconOf(first)),
    usable: views.some(isUsable),
    on: on || toned,
    level: ring,
    said: says ? saidOf(host, views, levelled ? ring : undefined) : undefined,
    tone,
    accent: host.accent(colour),
    switches: flip !== undefined,
    // a set none of whose members takes its call reads as it is and takes no tap; two taps its double where set
    onTap: host.tapper(
      item.double_tap_action,
      `quick_${own ?? group}`,
      flip
        ? flip.calls.length > 0
          ? () => runFlip(host, flip, tap.confirmation, name)
          : undefined
        : runs(tap),
      item.double_tap_action && runs(item.double_tap_action),
    ),
    onHold: runs(item.hold_action ?? MORE_INFO),
  };
}

/**
 * The pills a round grows into where it says its state (#205), the quick actions' own sheet: adopted by the card that
 * draws one (`wear`), so a house of rounds never pays for it.
 */
const PILLS = css`
  /* the round grown into a pill of its own fill as wide as the card sets it (on the 4 grid, its words never cut), its
     glyph where the round has it and its words 8 after it */
  .lt-bulb--said {
    flex: none;
    justify-content: flex-start;
    gap: 8px;
    padding-left: 12px;
    border-radius: var(--fluvy-radius-pill, 9999px);
  }
  .lt-bulb--said::before {
    border-radius: inherit;
  }
  /* its words set as a value (15/600, tabular figures): the text's ink at rest, the fill's lit, the secondary ink out
     of reach */
  .lt-said {
    font-size: 15px;
    font-weight: 600;
    line-height: 20px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: var(--fluvy-text);
  }
  .lt-bulb.is-on .lt-said {
    color: inherit;
  }
  .fv-ico--off .lt-said {
    color: var(--fluvy-text-secondary);
  }
  /* …or under its glyph: every round at the block's top, the glyphs on one line; a pill 64 tall and as wide as its
     words with 6 a side (44 the least), its words 4 under the glyph in 12/600 on their 16 line; on the photo the
     pills' feet stand on the name pill's, 16 from the foot */
  .rm-quick--under {
    align-items: flex-start;
    height: 64px;
  }
  .rm-quick--under > .lt-bulb--said {
    flex-direction: column;
    gap: 4px;
    height: 64px;
    padding: 12px 0 0;
  }
  .rm-quick--under .lt-said {
    font-size: 12px;
    line-height: 16px;
  }
  .rm-hero > .rm-quick--under {
    bottom: 16px;
  }
`;

/** The pills' sheet on the card's root, after its own, once. */
function wear(root: Node | undefined): void {
  const sheet = PILLS.styleSheet;
  if (root instanceof ShadowRoot && sheet && !root.adoptedStyleSheets.includes(sheet))
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
}

/** A state's words beside its glyph, and under it, as the pills' sheet sets them. */
const BESIDE = 'lt-said';
const UNDER = 'rm-quick--under > lt-said';
/** What a pill adds to its words: beside, the glyph's 12 and 20 and 8 after it, and 16 after them; under, 6 a side. */
const BESIDE_SIDES = 56;
const UNDER_SIDES = 12;

/**
 * The states that hold in `room` (what the rounds leave), each by what its pill adds to its round (`grows`): every
 * one in the longest of its forms they all hold in (one with fewer forms in its shortest), the last ones left out
 * where even their shortest do not hold.
 */
function statesIn(
  rounds: readonly QuickRound[],
  room: number,
  grows: (text: string) => number,
): (string | undefined)[] {
  const asked = rounds.flatMap((round, index) => (round.said ? [index] : []));
  const forms = Math.max(0, ...rounds.map((round) => round.said?.length ?? 0));
  for (let kept = asked.length; kept > 0; kept--)
    for (let form = 0; form < forms; form++) {
      const states = rounds.map(({ said }, index) =>
        said && asked.indexOf(index) < kept ? said[Math.min(form, said.length - 1)] : undefined,
      );
      if (states.reduce((sum, state) => sum + (state ? grows(state) : 0), 0) <= room) return states;
    }
  return [];
}

/**
 * The rounds in `room` (44 each, 8 apart, 12 after what is before them): as many as it holds, in the card's order;
 * then the states asked for in the room they leave (#205), each round that says one grown into the pill that holds
 * it — beside its glyph, or under it (`quick_state_position: under`: as wide as its words, 44 the least) — in the
 * longest forms that hold (`statesIn`): a state that does not is left out whole, its round a round again.
 */
export function quickRounds(host: QuickHost, room: number): QuickRounds {
  const fits = Math.floor((room - 12 + ROUND_GAP) / (ROUND + ROUND_GAP));
  const rounds =
    fits > 0
      ? quickActions(host)
          .slice(0, fits)
          .map((item) => roundOf(host, item))
      : [];
  if (!rounds.length) return { taken: 0, template: nothing };
  // their words are measured in the pills' sheet, which the card wears from the first state asked for
  if (rounds.some((round) => round.said)) wear(host.root);
  const under = host.config?.quick_state_position !== 'beside';
  // a pill's width, on the 4 grid: never under its round's
  const pill = (text: string): number =>
    Math.max(
      ROUND,
      under
        ? host.ruler.pill(UNDER, text, UNDER_SIDES)
        : host.ruler.pill(BESIDE, text, BESIDE_SIDES),
    );
  const grows = (text: string): number => pill(text) - ROUND;
  const taken = 12 + rounds.length * (ROUND + ROUND_GAP) - ROUND_GAP;
  const states = statesIn(rounds, room - taken, grows);
  return {
    taken: states.reduce((sum, state) => sum + (state ? grows(state) : 0), taken),
    // with a state under its glyph, every round stands at the block's top (none drawn: centred, as ever); the block
    // ends its line wherever it stands, its words placed from that end
    template: html`<div
      class="lt-bulbs rm-quick ${under && states.some(Boolean) ? 'rm-quick--under' : ''}"
      data-align="end"
    >
      ${rounds.map((round, index) => {
        const text = states[index];
        return levelRound({ ...round, state: text ? { text, width: pill(text) } : undefined });
      })}
    </div>`,
  };
}
