// @vitest-environment happy-dom
import { baseStyles } from '@fluvy/ui';
import { html, type CSSResultGroup, type TemplateResult } from 'lit';
import { afterEach, describe, expect, it } from 'vitest';
import { FluvyCard, type FluvyCardConfig } from '../card.js';
import type { HassEntity, HomeAssistant } from '../ha/types.js';
import { resolveEntity } from '../entity.js';
import { listedName, type EntityName } from '../names.js';

/**
 * How a card of a list names the items that say no name of their own (`names`, 1.22, #200): read once, where every
 * card reads a name (`nameFor`). The house is the reporter's: a motion sensor "Beweging" of the device "Eettafel VS",
 * which Home Assistant calls "Eettafel VS Beweging"; a door that is its device's own entity; a helper of no device.
 */
interface Item {
  readonly entity: string;
  readonly name?: EntityName;
}

class ListCard extends FluvyCard<FluvyCardConfig & { rows?: readonly Item[] }> {
  static override styles: CSSResultGroup = [...baseStyles];
  protected renderCard(): TemplateResult {
    return html`<article class="fv-card">
      ${(this.config?.rows ?? []).map(
        (row) => html`<p>${this.nameFor(this.entity(row.entity), row.name)}</p>`,
      )}
    </article>`;
  }
}
customElements.define('fluvy-card-names-test-card', ListCard);

const state = (entity_id: string, friendly_name: string): HassEntity => ({
  entity_id,
  state: 'on',
  attributes: { friendly_name },
  last_changed: '',
  last_updated: '',
});

const MOTION = 'binary_sensor.eettafel_vs_beweging';
const DOOR = 'binary_sensor.voordeur';
const HELPER = 'input_boolean.vakantie';

const hass = {
  states: {
    [MOTION]: state(MOTION, 'Eettafel VS Beweging'),
    [DOOR]: state(DOOR, 'Voordeur'),
    [HELPER]: state(HELPER, 'Vakantie'),
  },
  entities: {
    [MOTION]: { entity_id: MOTION, name: 'Beweging', device_id: 'd1', area_id: 'eetkamer' },
    [DOOR]: { entity_id: DOOR, name: null, device_id: 'd2' },
    [HELPER]: { entity_id: HELPER, name: 'Vakantie' },
  },
  devices: {
    d1: { id: 'd1', name: 'Eettafel VS', name_by_user: null, area_id: 'eetkamer' },
    d2: { id: 'd2', name: 'Voordeur', name_by_user: null, area_id: null },
  },
  areas: { eetkamer: { area_id: 'eetkamer', name: 'Eetkamer' } },
  themes: { darkMode: false },
} as unknown as HomeAssistant;

const ROWS: readonly Item[] = [{ entity: MOTION }, { entity: DOOR }, { entity: HELPER }];

async function said(config: Omit<FluvyCardConfig, 'type'> & { rows?: readonly Item[] }) {
  const card = document.createElement('fluvy-card-names-test-card') as ListCard;
  card.setConfig({ rows: ROWS, ...config, type: 'custom:fluvy-card-names-test-card' });
  card.hass = hass;
  document.body.append(card);
  await card.updateComplete;
  return [...card.shadowRoot!.querySelectorAll('p')].map((row) => row.textContent);
}

describe('a card’s `names` (#200)', () => {
  afterEach(() => document.body.replaceChildren());

  it('says Home Assistant’s name where the card asks for none, and in full', async () => {
    const friendly = ['Eettafel VS Beweging', 'Voordeur', 'Vakantie'];
    expect(await said({})).toEqual(friendly);
    expect(await said({ names: 'full' })).toEqual(friendly);
  });

  it('says each entity’s own name, its device’s where it has none', async () => {
    expect(await said({ names: 'entity' })).toEqual(['Beweging', 'Voordeur', 'Vakantie']);
  });

  it('says each one’s device, and Home Assistant’s name for an entity of no device', async () => {
    expect(await said({ names: 'device' })).toEqual(['Eettafel VS', 'Voordeur', 'Vakantie']);
  });

  it('takes Home Assistant’s parts as an item’s name does, an item with no such part keeping its name', async () => {
    expect(await said({ names: [{ type: 'entity' }, { type: 'area' }] })).toEqual([
      'Beweging Eetkamer',
      'Voordeur',
      'Vakantie',
    ]);
    expect(await said({ names: { type: 'area' } })).toEqual(['Eetkamer', 'Voordeur', 'Vakantie']);
  });

  it('leaves an item’s own name as it is: its words, its parts, its empty one', async () => {
    const rows: Item[] = [
      { entity: MOTION, name: 'Tafel' },
      { entity: MOTION, name: { type: 'device' } },
      { entity: MOTION, name: '' },
      { entity: MOTION },
    ];
    expect(await said({ rows, names: 'entity' })).toEqual(['Tafel', 'Eettafel VS', '', 'Beweging']);
  });

  it('reads words it does not know, or one name for every item, as none asked', async () => {
    const friendly = ['Eettafel VS Beweging', 'Voordeur', 'Vakantie'];
    expect(await said({ names: 'Sensor' as never })).toEqual(friendly);
    expect(await said({ names: 'area' as never })).toEqual(friendly);
  });
});

describe('listedName', () => {
  it('reads the two words as Home Assistant’s parts, parts as they are, and anything else as none asked', () => {
    const motion = resolveEntity(hass, MOTION);
    expect(listedName(hass, motion, 'entity')).toBe('Beweging');
    expect(listedName(hass, motion, 'device')).toBe('Eettafel VS');
    expect(listedName(hass, motion, [{ type: 'entity' }, { type: 'area' }])).toBe(
      'Beweging Eetkamer',
    );
    for (const none of ['full', 'area', '', undefined, null, 7, true])
      expect(listedName(hass, motion, none), String(none)).toBe('Eettafel VS Beweging');
  });
});
