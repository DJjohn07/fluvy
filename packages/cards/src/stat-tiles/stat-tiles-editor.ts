import { strings as words, type LovelaceConfigForm } from '@fluvy/core';
import { HEAD_BASE, type BaseKey } from '../shared/base.js';
import {
  accentField,
  actionFields,
  bandTintField,
  boolField,
  colourFields,
  editorLabels,
  emptyFields,
  entitiesField,
  entityField,
  fieldRow,
  holdsDevice,
  iconField,
  idsOnly,
  listsHoldThresholds,
  nameField,
  nameIconFields,
  namesField,
  NUMBER_DEFAULTS,
  numberFields,
  onlyWhen,
  selectField,
  headFields,
  textField,
  thresholdsField,
  titleFields,
  toneField,
} from '../shared/form.js';
import type { EditorDefaults, RowsListSpec } from '../shared/rows-editor.js';
import { configKeys } from '../shared/config.js';
import { EMPTY_KEYS } from '../shared/lists.js';
import type { StatTilesCardConfig, StatTilesVariant } from './stat-tiles-card.js';

/** The stat tiles card's editor: fetched by its `editor()` the first time the card is edited, never by a dashboard. */

const strings = words('stat-tiles');

const VARIANTS: readonly StatTilesVariant[] = ['full', 'compact'];

const COLUMNS = ['auto', '2', '3'] as const;

/** A card with a headline value of its own: the base of a card of one entity, and how its tiles and rows are named. */
export const base: readonly BaseKey[] = [...HEAD_BASE, 'names'];

export const keys = configKeys<StatTilesCardConfig>()([
  'title',
  'subtitle',
  'variant',
  'columns',
  'badge_entity',
  'badge_label',
  'tiles',
  'rows',
  'unit',
  'decimals',
  'tint',
  ...EMPTY_KEYS,
]);

export const lists: readonly RowsListSpec[] = [
  {
    key: 'tiles',
    title: 'editor.tiles',
    keys: [
      'entity',
      'name',
      'icon',
      'tone',
      'highlight',
      'unit',
      'decimals',
      'thresholds',
      'tap_action',
      'hold_action',
      'double_tap_action',
    ],
    schema: [
      entityField(),
      nameIconFields(),
      fieldRow(toneField(), boolField('highlight')),
      numberFields(),
      // a tile's figure and glyph past a threshold take its colour (1.22, #204)
      thresholdsField(),
      actionFields({ hold: 'none' }),
    ],
  },
  {
    key: 'rows',
    title: 'editor.rows',
    keys: [
      'entity',
      'name',
      'icon',
      'secondary',
      'tone',
      'color',
      'thresholds',
      'tap_action',
      'hold_action',
      'double_tap_action',
    ],
    schema: [
      entityField(),
      nameIconFields(),
      textField('secondary'),
      fieldRow(toneField(), accentField('color', { item: 'own' })),
      thresholdsField(),
      actionFields(),
    ],
  },
];

/** Two a row in full; compact tiles take three when they fit. */
export const defaults: EditorDefaults = (config) => ({
  variant: 'full',
  columns: config.variant === 'compact' ? 'auto' : '2',
  tint: 'off',
  ...NUMBER_DEFAULTS,
});

export function getConfigForm(): LovelaceConfigForm {
  return {
    schema: [
      titleFields(),
      iconField(),
      headFields(),
      ...colourFields(),
      fieldRow(selectField('variant', VARIANTS), selectField('columns', COLUMNS)),
      entitiesField('tiles', undefined, true),
      fieldRow(entityField(undefined, 'entity', false), nameField()),
      fieldRow({ name: 'badge_entity', selector: { entity: {} } }, textField('badge_label')),
      entitiesField('rows'),
      // how the tiles and the rows that say no name are named
      onlyWhen(
        (data, hass) =>
          holdsDevice('tiles', 'entities')(data, hass) || holdsDevice('rows')(data, hass),
        namesField(),
      ),
      emptyFields(),
      // a tile past a threshold fills in its colour, where a tile names one
      bandTintField(listsHoldThresholds('tiles')),
      numberFields(),
      actionFields({ icon: true }),
    ],
    ...idsOnly('tiles', 'rows'),
    ...editorLabels(
      strings,
      { tiles: 'tiles', rows: 'rows', badge_entity: 'badge_entity', badge_label: 'badge_label' },
      {},
    ),
  };
}
