import {
  lightDefaults,
  resolveEntity,
  type HaFormSchemaItem,
  type LovelaceConfigForm,
} from '@fluvy/core';
import {
  actionFields,
  acts,
  askedSliderStyle,
  colourFields,
  drawsSwitch,
  entitiesField,
  entityField,
  fieldRow,
  formLabels,
  lightColourFields,
  nameField,
  nameIconFields,
  nameLinesField,
  numberFields,
  onlyWhen,
  selectField,
  showActionField,
  showSwitchField,
  sinceChoices,
  sinceField,
  sliderFields,
  switches,
  switchStyleField,
  tintField,
  unitChoices,
} from '../shared/form.js';
import { ENTITY_BASE, ICON_ACTIONS_BASE, SLIDER_BASE, type BaseKey } from '../shared/base.js';
import { configKeys } from '../shared/config.js';
import type { EditorChoices, EditorDefaults, RowsListSpec } from '../shared/rows-editor.js';
import { ladderOf } from '../shared/units.js';
import { ruled, TILE_SIZES, tintsAtRest, type TileCardConfig } from './tile-card.js';

/** The tile card's editor: fetched by its `editor()` the first time the card is edited, never by a dashboard. */

export const base: readonly BaseKey[] = [
  ...ENTITY_BASE,
  'name_lines',
  ...SLIDER_BASE,
  ...ICON_ACTIONS_BASE,
];

export const keys = configKeys<TileCardConfig>()([
  'size',
  'show_switch',
  'switch_style',
  'show_action',
  'readouts',
  'since',
  'tint',
  'light_colors',
  'light_whites',
]);

export const defaults: EditorDefaults = () => ({
  size: 'large',
  name_lines: '1',
  show_switch: true,
  switch_style: 'toggle',
  show_action: false,
  since: '',
  tint: 'on',
  light_colors: lightDefaults().colors,
  light_whites: 'temperature',
});

/** `since` offers the house's timestamp sensors. */
export const choices: EditorChoices = sinceChoices;

/** Whether the tile is large: its size where its config names none. */
const large = (size: unknown): boolean => size === 'large' || size === undefined;

/** Whether the tile draws a switch that has a style: a large one that shows it, a compact one, of an entity that switches. */
const styled: NonNullable<HaFormSchemaItem['when']> = ({ size, entity, show_switch }) =>
  drawsSwitch(size, show_switch) && switches(entity);

/**
 * Whether the tile is large with a ruler at its foot (`ruled`): what the slider's style and its readouts hang on. A
 * wall rocker's tile has none: it switches and nothing more.
 */
const largeRuled: NonNullable<HaFormSchemaItem['when']> = (data, hass) =>
  large(data['size']) &&
  !(styled(data) && data['switch_style'] === 'rocker') &&
  ruled(resolveEntity(hass, String(data['entity'])));

/**
 * Whether the tile draws its readouts: a large one's foot is its ruler when it has one, unless the tile is its own
 * slider (the fill); a small one's line says them.
 */
const drawsReadouts: NonNullable<HaFormSchemaItem['when']> = (data, hass) =>
  !largeRuled(data, hass) || askedSliderStyle(data) === 'fill';

/**
 * A tile's readouts, item by item (#197): each a sensor, with a name of its own and the unit and the decimals its
 * figure reads in — the units its own class converts to. The template card's large tile draws the same.
 */
export const READOUTS: RowsListSpec = {
  key: 'readouts',
  title: 'editor.readouts',
  domains: ['sensor'],
  keys: ['entity', 'name', 'unit', 'decimals'],
  schema: [entityField(['sensor']), nameField(), numberFields()],
  choices: (item, hass) => {
    const state = hass?.states[String(item['entity'])];
    return state
      ? { unit: unitChoices(ladderOf(String(state.attributes['unit_of_measurement'] ?? ''))) }
      : {};
  },
};

/** The readouts, where the tile draws them. */
export const lists: readonly RowsListSpec[] = [{ ...READOUTS, when: drawsReadouts }];

export function getConfigForm(): LovelaceConfigForm {
  return {
    schema: [
      entityField(),
      nameIconFields(),
      // a small tile's name may take two lines; a large one's switch may give way to its circle, where it has one
      fieldRow(
        selectField('size', TILE_SIZES),
        onlyWhen(({ size }) => size !== 'large', nameLinesField()),
        onlyWhen(({ size, entity }) => large(size) && switches(entity), showSwitchField()),
      ),
      // its switch's style where it draws one: a large tile that shows it, a compact one's at its row's end
      onlyWhen(styled, switchStyleField()),
      // a climate or a humidifier says what it is doing and what it is set to, where it said its mode
      onlyWhen(({ entity }) => acts(entity), showActionField()),
      sinceField(),
      ...colourFields(),
      onlyWhen(tintsAtRest, tintField()),
      // a light's colours, for a light; the slider's style where a large tile's foot is one
      onlyWhen(({ entity }) => String(entity).startsWith('light.'), lightColourFields()),
      ...sliderFields(true).map((row) => onlyWhen(largeRuled, row)),
      // the readouts are edited item by item (the rows editor takes the field out of the form)
      entitiesField('readouts', ['sensor']),
      // a small tile's tap toggles what toggles, a large one's opens; its circle may be its switch
      actionFields({ icon: true, tap: null, iconTap: null }),
    ],
    ...formLabels({ readouts: 'editor.readouts' }),
  };
}
