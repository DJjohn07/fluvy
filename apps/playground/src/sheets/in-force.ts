import { FluvyFanCard } from '../../../../packages/cards/src/fan/fan-card.js';
import { FluvyHelpersCard } from '../../../../packages/cards/src/helpers/helpers-card.js';
import { FluvyMediaCard } from '../../../../packages/cards/src/media/media-card.js';
import { FluvyRemoteCard } from '../../../../packages/cards/src/remote/remote-card.js';
import { FluvyThermostatCard } from '../../../../packages/cards/src/thermostat/thermostat-card.js';
import { FluvyVacuumCard } from '../../../../packages/cards/src/vacuum/vacuum-card.js';
import { CLIMATE, speakingAttributes } from '../attribute-words.js';
import type { SheetSpec } from '../scenes.js';

// their chunks land after the page has drawn: the sheet defines the cards from their modules, as the climate sheet does
for (const [tag, card] of [
  ['fluvy-thermostat-card', FluvyThermostatCard],
  ['fluvy-fan-card', FluvyFanCard],
  ['fluvy-vacuum-card', FluvyVacuumCard],
  ['fluvy-helpers-card', FluvyHelpersCard],
  ['fluvy-media-card', FluvyMediaCard],
  ['fluvy-remote-card', FluvyRemoteCard],
] as const)
  if (!customElements.get(tag)) customElements.define(tag, card);

const THERMOSTAT = 'custom:fluvy-thermostat-card';

/* media_player supported_features: pause 1 · volume set 4 · mute 8 · previous 16 · next 32 · turn on 128 · turn off 256 ·
   select source 2048 · play 16384 */
const SOUNDBAR = 1 | 4 | 8 | 16 | 32 | 128 | 256 | 2048 | 16384;
const TV = 1 | 4 | 8 | 16 | 32 | 128 | 256 | 2048 | 4096 | 16384;
/* vacuum: PAUSE 4 · STOP 8 · RETURN_HOME 16 · FAN_SPEED 32 · BATTERY 64 · LOCATE 512 · START 8192 */
const ROBOT = 4 | 8 | 16 | 32 | 64 | 512 | 8192;

/**
 * The value in force always shows (#202): a row of choices that leaves out the value the device runs at stands it
 * first, chosen at full strength and taking no tap. The reporter's hall air conditioner (a Mitsubishi on ESPHome) at a
 * fan speed its firmware does not list; a study's thermostat in a mode and a preset its own lists leave out; a water
 * heater past its first six operations; an air purifier's preset, a robot's suction, a select's option the row does
 * not offer, a television's input it does not list, and a soundbar's (every input it lists kept: 1.21 dropped the last
 * one to make room).
 */
export const sheet: SheetSpec = {
  states: [
    [
      'climate.if_hall',
      'cool',
      {
        friendly_name: 'Hall air conditioner',
        hvac_modes: ['off', 'heat_cool', 'cool', 'heat', 'dry', 'fan_only'],
        min_temp: 16,
        max_temp: 31,
        target_temp_step: 0.5,
        temperature: 23,
        current_temperature: 24.6,
        hvac_action: 'cooling',
        fan_modes: ['low', 'high'],
        fan_mode: 'middle',
      },
    ],
    [
      'climate.if_study',
      'auto',
      {
        friendly_name: 'Study',
        hvac_modes: ['off', 'heat', 'auto'],
        min_temp: 5,
        max_temp: 30,
        target_temp_step: 0.5,
        temperature: 20.5,
        current_temperature: 19.8,
        hvac_action: 'heating',
        preset_modes: ['eco', 'comfort', 'boost'],
        preset_mode: 'sleep',
      },
    ],
    [
      'water_heater.if_tank',
      'high_demand',
      {
        friendly_name: 'Hot water',
        operation_list: [
          'eco',
          'heat_pump',
          'off',
          'electric',
          'gas',
          'performance',
          'high_demand',
        ],
        min_temp: 43,
        max_temp: 60,
        temperature: 55,
        current_temperature: 51,
      },
    ],
    [
      'fan.if_purifier',
      'on',
      {
        friendly_name: 'Bedroom purifier',
        percentage: 40,
        percentage_step: 1,
        preset_modes: ['Auto', 'Silent', 'Favorite'],
        preset_mode: 'Fan',
        supported_features: 1 | 8,
      },
    ],
    [
      'vacuum.if_robot',
      'cleaning',
      {
        friendly_name: 'Roborock S8',
        battery_level: 64,
        fan_speed_list: ['quiet', 'balanced', 'turbo', 'max'],
        fan_speed: 'max_plus',
        supported_features: ROBOT,
      },
    ],
    [
      'input_select.if_heating',
      'Holiday',
      { friendly_name: 'Heating schedule', options: ['Home', 'Away', 'Night', 'Holiday'] },
    ],
    [
      'media_player.if_soundbar',
      'playing',
      {
        friendly_name: 'Living room soundbar',
        device_class: 'speaker',
        media_title: 'Weightless',
        media_artist: 'Marconi Union',
        volume_level: 0.28,
        is_volume_muted: false,
        source: 'Bluetooth',
        source_list: ['TV', 'HDMI 1', 'HDMI 2'],
        supported_features: SOUNDBAR,
      },
    ],
    [
      'media_player.if_tv',
      'on',
      {
        friendly_name: 'Living room TV',
        device_class: 'tv',
        volume_level: 0.32,
        is_volume_muted: false,
        source: 'PlayStation 5',
        source_list: ['HDMI 1', 'HDMI 2', 'Netflix', 'YouTube'],
        supported_features: TV,
      },
    ],
  ],
  frames: [
    {
      title: 'Thermostat · the speed it runs at, not offered (#202)',
      hass: speakingAttributes(CLIMATE),
      cards: [{ type: THERMOSTAT, entity: 'climate.if_hall' }],
    },
    {
      title: 'Thermostat · a mode and a preset its lists leave out',
      hass: speakingAttributes(CLIMATE),
      cards: [
        {
          type: THERMOSTAT,
          entity: 'climate.if_study',
          variant: 'compact',
          modes: ['heat', 'off'],
        },
      ],
    },
    {
      title: 'Water heater · the seventh it runs, past its first six',
      cards: [{ type: THERMOSTAT, entity: 'water_heater.if_tank', variant: 'compact' }],
    },
    {
      title: 'Half a section · the mode and the speed in force',
      hass: speakingAttributes(CLIMATE),
      cards: [
        {
          type: THERMOSTAT,
          entity: 'climate.if_study',
          variant: 'compact',
          modes: ['heat', 'off'],
          cols: 6,
        },
        {
          type: THERMOSTAT,
          entity: 'climate.if_hall',
          variant: 'compact',
          show_modes: false,
          cols: 6,
        },
      ],
    },
    {
      title: 'Fan · a preset it does not list',
      cards: [{ type: 'custom:fluvy-fan-card', entity: 'fan.if_purifier' }],
    },
    {
      title: 'Vacuum · a suction its list leaves out',
      cards: [{ type: 'custom:fluvy-vacuum-card', entity: 'vacuum.if_robot' }],
    },
    {
      title: 'Helpers · an option its row does not offer',
      cards: [
        {
          type: 'custom:fluvy-helpers-card',
          title: 'Heating',
          rows: [{ entity: 'input_select.if_heating', options: ['Home', 'Away', 'Night'] }],
        },
      ],
    },
    {
      title: 'Remote · an input it does not list',
      cards: [
        {
          type: 'custom:fluvy-remote-card',
          entity: 'media_player.if_tv',
          groups: ['source', 'apps'],
        },
      ],
    },
    {
      title: 'Media · an input it does not list, every listed one kept',
      cards: [{ type: 'custom:fluvy-media-card', entity: 'media_player.if_soundbar' }],
    },
  ],
};
