import type { HassEntity, HomeAssistant } from '@fluvy/core';

/*
 * Cars as their integrations' registries and states name them, one of each the card reads by its words, and a few
 * things on a car's device that are never a role (a horn, a wake button, a charge cable's latch, a 12 V battery, a
 * route's tracker): what the vehicle's discovery and its card are tested on.
 */

/** An entity of a car: its id, its state, its key where the integration gives one, its attributes. */
type Seed = readonly [
  id: string,
  state: string,
  key?: string | undefined,
  attributes?: Record<string, unknown>,
  category?: 'diagnostic' | 'config',
];

/** A car: its device, its integration, its entities. */
export interface CarFixture {
  readonly device: string;
  readonly name: string;
  readonly platform: string;
  readonly seeds: readonly Seed[];
}

const pct = { unit_of_measurement: '%', device_class: 'battery' };
const km = { unit_of_measurement: 'km', device_class: 'distance' };

/** A Model Y on Teslemetry, charging to 80 % at home. */
export const TESLA: CarFixture = {
  device: 'd-tesla',
  name: 'Model Y',
  platform: 'teslemetry',
  seeds: [
    ['sensor.model_y_battery_level', '64', 'charge_state_battery_level', pct],
    ['sensor.model_y_usable_battery_level', '63', 'charge_state_usable_battery_level', pct],
    ['sensor.model_y_battery_range', '320', 'charge_state_battery_range', km],
    ['sensor.model_y_estimate_battery_range', '301', 'charge_state_est_battery_range', km],
    [
      'sensor.model_y_charging',
      'charging',
      'charge_state_charging_state',
      { device_class: 'enum' },
    ],
    ['switch.model_y_charge', 'on', 'charge_state_charging_state'],
    [
      'binary_sensor.model_y_charge_cable',
      'on',
      'charge_state_conn_charge_cable',
      { device_class: 'connectivity' },
    ],
    [
      'sensor.model_y_charger_power',
      '7.2',
      'charge_state_charger_power',
      { unit_of_measurement: 'kW', device_class: 'power' },
    ],
    [
      'sensor.model_y_charge_rate',
      '46',
      'charge_state_charge_rate',
      { unit_of_measurement: 'km/h' },
    ],
    [
      'sensor.model_y_time_to_full_charge',
      '2026-11-04T13:12:00+00:00',
      'charge_state_minutes_to_full_charge',
      { device_class: 'timestamp' },
      'diagnostic',
    ],
    ['number.model_y_charge_limit', '80', 'charge_state_charge_limit_soc', { min: 50, max: 100 }],
    [
      'cover.model_y_charge_port_door',
      'open',
      'charge_state_charge_port_door_open',
      { supported_features: 3 },
    ],
    ['lock.model_y_charge_cable_lock', 'locked', 'charge_state_charge_port_latch'],
    [
      'climate.model_y_climate',
      'off',
      'driver_temp',
      { current_temperature: 14, temperature: 21, hvac_modes: ['off', 'heat_cool'] },
    ],
    ['climate.model_y_cabin_overheat_protection', 'off', 'climate_state_cabin_overheat_protection'],
    [
      'sensor.model_y_inside_temperature',
      '14',
      'climate_state_inside_temp',
      { unit_of_measurement: '°C' },
    ],
    [
      'sensor.model_y_outside_temperature',
      '11',
      'climate_state_outside_temp',
      { unit_of_measurement: '°C' },
    ],
    ['lock.model_y_lock', 'locked', 'vehicle_state_locked'],
    ['cover.model_y_trunk', 'closed', 'vehicle_state_rt', { supported_features: 3 }],
    ['cover.model_y_frunk', 'closed', 'vehicle_state_ft', { supported_features: 1 }],
    ['cover.model_y_windows', 'closed', 'windows', { supported_features: 3 }],
    ['switch.model_y_sentry_mode', 'off', 'vehicle_state_sentry_mode'],
    ['sensor.model_y_odometer', '24318', 'vehicle_state_odometer', km, 'diagnostic'],
    [
      'sensor.model_y_tire_pressure_front_left',
      '2.9',
      'vehicle_state_tpms_pressure_fl',
      { unit_of_measurement: 'bar' },
    ],
    [
      'sensor.model_y_tire_pressure_rear_right',
      '2.3',
      'vehicle_state_tpms_pressure_rr',
      { unit_of_measurement: 'bar' },
    ],
    [
      'binary_sensor.model_y_tire_pressure_warning_rear_right',
      'on',
      'vehicle_state_tpms_soft_warning_rr',
      { device_class: 'problem' },
    ],
    [
      'binary_sensor.model_y_front_driver_door',
      'off',
      'vehicle_state_df',
      { device_class: 'door' },
      'diagnostic',
    ],
    ['device_tracker.model_y_location', 'home', 'location'],
    ['device_tracker.model_y_route', 'not_home', 'route'],
    ['update.model_y_update', 'off', 'vehicle_state_software_update_status'],
    ['binary_sensor.model_y_status', 'on', 'state', { device_class: 'connectivity' }],
    ['sensor.model_y_shift_state', 'p', 'drive_state_shift_state'],
    ['button.model_y_honk_horn', 'unknown', 'honk'],
    ['button.model_y_wake', 'unknown', 'wake'],
    ['button.model_y_homelink', 'unknown', 'homelink'],
  ],
};

/** An EV6 on Kia's integration: plugged in and not charging, unlocked, a window open; its 12 V battery beside its own. */
export const KIA: CarFixture = {
  device: 'd-kia',
  name: 'EV6',
  platform: 'kia_uvo',
  seeds: [
    ['sensor.ev6_car_battery_level', '88', 'car_battery_percentage', pct],
    ['sensor.ev6_ev_battery_level', '76', 'ev_battery_percentage', pct],
    ['sensor.ev6_ev_range', '402', 'ev_driving_range', km],
    ['sensor.ev6_total_driving_range', '402', 'total_driving_range', km],
    [
      'binary_sensor.ev6_ev_battery_charge',
      'off',
      'ev_battery_is_charging',
      { device_class: 'battery_charging' },
    ],
    [
      'binary_sensor.ev6_ev_battery_plug',
      'on',
      'ev_battery_is_plugged_in',
      { device_class: 'plug' },
    ],
    ['number.ev6_ac_charging_limit', '90', 'ev_charge_limits_ac', { min: 50, max: 100 }],
    ['number.ev6_dc_charging_limit', '80', 'ev_charge_limits_dc', { min: 50, max: 100 }],
    ['switch.ev6_ev_charging', 'off', 'ev_charging'],
    ['climate.ev6_climate', 'off', 'climate_control', { hvac_modes: ['off', 'auto'] }],
    ['sensor.ev6_set_temperature', '22', 'air_temperature', { unit_of_measurement: '°C' }],
    ['lock.ev6_door_lock', 'unlocked', 'door_lock'],
    ['binary_sensor.ev6_locked', 'on', 'is_locked', { device_class: 'lock' }],
    [
      'binary_sensor.ev6_front_left_door',
      'off',
      'front_left_door_is_open',
      { device_class: 'door' },
    ],
    ['binary_sensor.ev6_trunk', 'off', 'trunk_is_open', { device_class: 'door' }],
    ['binary_sensor.ev6_hood', 'off', 'hood_is_open', { device_class: 'door' }],
    [
      'binary_sensor.ev6_front_left_window',
      'on',
      'front_left_window_is_open',
      { device_class: 'window' },
    ],
    ['sensor.ev6_odometer', '18233', 'odometer', km],
    [
      'sensor.ev6_tire_pressure_front_left',
      '36',
      'tire_pressure_front_left',
      { unit_of_measurement: 'psi' },
    ],
    [
      'binary_sensor.ev6_tire_all',
      'off',
      'tire_pressure_all_warning_is_on',
      { device_class: 'problem' },
    ],
    ['device_tracker.ev6_location', 'home', 'location'],
    ['sensor.ev6_geocoded_location', 'Carrer de Mallorca 401', 'geocode_name'],
    [
      'sensor.ev6_last_updated_at',
      '2026-11-04T10:00:00+00:00',
      'last_updated_at',
      { device_class: 'timestamp' },
    ],
    ['button.ev6_force_update', 'unknown', 'force_refresh'],
    ['button.ev6_open_all_windows', 'unknown', 'open_all_windows'],
  ],
};

/** A Zoe on Renault's: its battery, cable, charge and lock without keys; its charge and its climate as buttons. */
export const RENAULT: CarFixture = {
  device: 'd-renault',
  name: 'Zoe',
  platform: 'renault',
  seeds: [
    ['sensor.zoe_battery', '52', undefined, pct],
    ['sensor.zoe_battery_autonomy', '190', 'battery_autonomy', km],
    [
      'sensor.zoe_charge_state',
      'waiting_for_a_planned_charge',
      'charge_state',
      { device_class: 'enum' },
    ],
    ['binary_sensor.zoe_plugged_in', 'on', undefined, { device_class: 'plug' }],
    ['binary_sensor.zoe_charging', 'off', undefined, { device_class: 'battery_charging' }],
    ['button.zoe_start_charge', 'unknown', 'start_charge'],
    ['button.zoe_stop_charge', 'unknown', 'stop_charge'],
    ['button.zoe_start_air_conditioner', 'unknown', 'start_air_conditioner'],
    ['binary_sensor.zoe_hvac', 'off', 'hvac_status'],
    ['binary_sensor.zoe_lock', 'off', undefined, { device_class: 'lock' }],
    ['binary_sensor.zoe_hatch', 'off', 'hatch_status', { device_class: 'door' }],
    ['sensor.zoe_mileage', '41200', 'mileage', km],
    ['device_tracker.zoe_location', 'not_home', 'location'],
    ['button.zoe_sound_horn', 'unknown', 'sound_horn'],
  ],
};

/** An EX30 on Volvo's: its battery without a key, its climate as two buttons, a tyre's warning by its wheel. */
export const VOLVO: CarFixture = {
  device: 'd-volvo',
  name: 'EX30',
  platform: 'volvo',
  seeds: [
    ['sensor.ex30_battery', '81', undefined, pct],
    ['sensor.ex30_distance_to_empty_battery', '310', 'distance_to_empty_battery', km],
    ['sensor.ex30_charging_status', 'idle', 'charging_status', { device_class: 'enum' }],
    [
      'sensor.ex30_charger_connection_status',
      'disconnected',
      'charger_connection_status',
      { device_class: 'enum' },
    ],
    ['button.ex30_climatization_start', 'unknown', 'climatization_start'],
    ['button.ex30_climatization_stop', 'unknown', 'climatization_stop'],
    ['lock.ex30_lock', 'locked', 'lock'],
    ['binary_sensor.ex30_tailgate', 'off', 'tailgate', { device_class: 'door' }],
    ['binary_sensor.ex30_tire_front_right', 'on', 'tire_front_right', { device_class: 'problem' }],
    ['sensor.ex30_availability', 'power_saving_mode', 'availability', { device_class: 'enum' }],
    ['button.ex30_honk_flash', 'unknown', 'honk_flash'],
    ['button.ex30_engine_start', 'unknown', 'engine_start'],
  ],
};

/** An MG4 on mg_saic: named in English, keyed only by its reachability; its fuel level wears the battery's class. */
export const MG: CarFixture = {
  device: 'd-mg',
  name: 'MG MG4',
  platform: 'mg_saic',
  seeds: [
    ['sensor.mg_mg4_state_of_charge', '47', undefined, pct],
    ['sensor.mg_mg4_fuel_level', '0', undefined, pct],
    ['sensor.mg_mg4_electric_range', '210', undefined, km],
    ['sensor.mg_mg4_charging_status', 'Charging (AC)'],
    ['lock.mg_mg4_lock', 'locked'],
    ['binary_sensor.mg_mg4_boot_status', 'off', undefined, { device_class: 'door' }],
    ['sensor.mg_mg4_vehicle_reachability', 'likely_asleep', 'vehicle_reachability'],
    ['button.mg_mg4_trigger_alarm', 'unknown'],
    ['button.mg_mg4_open_boot', 'unknown'],
  ],
};

/** An ID.4 on volkswagencarnet: its lock and its doors' lock sensor, the boot's own lock (never the car's). */
export const VW: CarFixture = {
  device: 'd-vw',
  name: 'ID.4',
  platform: 'volkswagencarnet',
  seeds: [
    ['sensor.id_4_battery_level', '66', undefined, pct],
    ['sensor.id_4_electric_range', '280', undefined, km],
    ['sensor.id_4_charging_state', 'Charge purpose reached and conservation charging'],
    ['binary_sensor.id_4_doors_locked', 'off', undefined, { device_class: 'lock' }],
    ['lock.id_4_door_locked', 'locked'],
    ['lock.id_4_trunk_locked', 'locked'],
    ['switch.id_4_force_data_refresh', 'off'],
  ],
};

/** An i4 on BMW's CarData: its EV charge beside its 12 V battery's, named in English; its tracker keyed. */
export const BMW: CarFixture = {
  device: 'd-bmw',
  name: 'i4',
  platform: 'cardata',
  seeds: [
    ['sensor.i4_battery_charge_level_12v', '91', undefined, pct],
    ['sensor.i4_battery_ev_state_of_charge', '54', undefined, pct],
    ['sensor.i4_range_ev_remaining_range', '241', undefined, km],
    ['sensor.i4_charging_ev_charging_state', 'NOCHARGING'],
    ['sensor.i4_doors_lock', 'SECURED'],
    ['device_tracker.i4_location', 'home', 'car'],
  ],
};

/* ---------- #207: cars that burn fuel, in their integrations' words ---------- */

const pctOnly = { unit_of_measurement: '%' };
const days = { unit_of_measurement: 'd', device_class: 'duration' };

/** A Sportage on Kia's, petrol: its tank, its range on it and the whole, its warning, its oil, its 12 V battery. */
export const SPORTAGE: CarFixture = {
  device: 'd-sportage',
  name: 'Sportage',
  platform: 'kia_uvo',
  seeds: [
    ['sensor.sportage_car_battery_level', '88', 'car_battery_percentage', pct],
    ['sensor.sportage_fuel_level', '47', 'fuel_level', pctOnly],
    ['sensor.sportage_fuel_driving_range', '402', 'fuel_driving_range', km],
    ['sensor.sportage_total_driving_range', '402', 'total_driving_range', km],
    ['binary_sensor.sportage_fuel_low', 'off', 'fuel_level_is_low', {}, 'diagnostic'],
    [
      'binary_sensor.sportage_oil_warning',
      'off',
      'oil_level_warning_is_on',
      { device_class: 'problem' },
      'diagnostic',
    ],
    ['sensor.sportage_next_service', '6200', 'next_service_distance', km, 'diagnostic'],
    ['binary_sensor.sportage_hood', 'off', 'hood_is_open', { device_class: 'door' }],
    ['lock.sportage_door_lock', 'locked', 'door_lock'],
    ['sensor.sportage_odometer', '31820', 'odometer', km],
    ['device_tracker.sportage_location', 'home', 'location'],
  ],
};

/** A Niro plug-in hybrid on Kia's: its battery and its tank, each with its range, charging. */
export const NIRO: CarFixture = {
  device: 'd-niro',
  name: 'Niro',
  platform: 'kia_uvo',
  seeds: [
    ['sensor.niro_ev_battery_level', '64', 'ev_battery_percentage', pct],
    ['sensor.niro_ev_range', '38', 'ev_driving_range', km],
    ['sensor.niro_fuel_level', '54', 'fuel_level', pctOnly],
    ['sensor.niro_fuel_driving_range', '520', 'fuel_driving_range', km],
    ['sensor.niro_total_driving_range', '558', 'total_driving_range', km],
    [
      'binary_sensor.niro_ev_battery_charge',
      'on',
      'ev_battery_is_charging',
      { device_class: 'battery_charging' },
    ],
    [
      'binary_sensor.niro_ev_battery_plug',
      'on',
      'ev_battery_is_plugged_in',
      { device_class: 'plug' },
    ],
    [
      'sensor.niro_ev_charging_power',
      '3.3',
      'ev_charging_power',
      { unit_of_measurement: 'kW', device_class: 'power' },
    ],
    ['number.niro_ac_charging_limit', '100', 'ev_charge_limits_ac', { min: 50, max: 100 }],
    ['switch.niro_ev_charging', 'on', 'ev_charging'],
    ['lock.niro_door_lock', 'locked', 'door_lock'],
    ['device_tracker.niro_location', 'home', 'location'],
  ],
};

/**
 * An Octavia diesel on MySkoda: its tank, its whole range, its AdBlue lasting 850 km, its inspection in km and days and
 * its oil service after it.
 */
export const OCTAVIA: CarFixture = {
  device: 'd-octavia',
  name: 'Octavia',
  platform: 'myskoda',
  seeds: [
    ['sensor.octavia_fuel_level', '41', 'fuel_level', pctOnly],
    ['sensor.octavia_range', '562', 'range', km],
    ['sensor.octavia_adblue_range', '850', 'adblue_range', km],
    ['sensor.octavia_oil_service', '12800', 'oil_service_in_km', km],
    ['sensor.octavia_oil_service_2', '211', 'oil_service_in_days', days],
    ['sensor.octavia_next_inspection', '4200', 'inspection_in_km', km],
    ['sensor.octavia_next_inspection_2', '63', 'inspection', days],
    ['sensor.octavia_mileage', '84312', 'mileage', km],
    ['binary_sensor.octavia_bonnet', 'off', 'bonnet_open', { device_class: 'opening' }],
    ['lock.octavia_door_lock', 'locked', 'door_lock'],
  ],
};

/** An XC60 plug-in hybrid on Volvo's: its battery (no key), its tank in litres and how far it goes, its oil, its service. */
export const XC60: CarFixture = {
  device: 'd-xc60',
  name: 'XC60',
  platform: 'volvo',
  seeds: [
    ['sensor.xc60_battery', '23', undefined, pct],
    ['sensor.xc60_distance_to_empty_battery', '14', 'distance_to_empty_battery', km],
    [
      'sensor.xc60_fuel_amount',
      '38',
      'fuel_amount',
      { unit_of_measurement: 'L', device_class: 'volume_storage' },
    ],
    ['sensor.xc60_distance_to_empty_tank', '486', 'distance_to_empty_tank', km],
    ['binary_sensor.xc60_oil_level', 'off', 'oil_level_warning', { device_class: 'problem' }],
    ['sensor.xc60_distance_to_service', '9300', 'distance_to_service', km],
    ['sensor.xc60_service', 'no_warning', 'service_warning', { device_class: 'enum' }],
    ['sensor.xc60_time_to_service', '148', 'time_to_service', days],
    [
      'sensor.xc60_time_to_engine_service',
      '310',
      'engine_time_to_service',
      { unit_of_measurement: 'h' },
    ],
    ['lock.xc60_lock', 'locked', 'lock'],
  ],
};

/** A Clio on Renault's, petrol: what is in its tank (litres, no level) and how far it goes. */
export const CLIO: CarFixture = {
  device: 'd-clio',
  name: 'Clio',
  platform: 'renault',
  seeds: [
    [
      'sensor.clio_fuel_quantity',
      '29',
      'fuel_quantity',
      { unit_of_measurement: 'L', device_class: 'volume' },
    ],
    ['sensor.clio_fuel_autonomy', '512', 'fuel_autonomy', km],
    ['sensor.clio_mileage', '23880', 'mileage', km],
    ['binary_sensor.clio_lock', 'off', undefined, { device_class: 'lock' }],
    ['device_tracker.clio_location', 'home', 'location'],
  ],
};

/**
 * A RAV4 plug-in hybrid on Toyota's (HACS): its reported charge beside its usable one, its electric range beside the
 * fuel's and the whole, its hood (a door's class); its lock named in words.
 */
export const RAV4: CarFixture = {
  device: 'd-rav4',
  name: 'RAV4',
  platform: 'toyota',
  seeds: [
    ['sensor.rav4_battery_level', '96', 'battery_level', pct],
    ['sensor.rav4_usable_battery_level', '81', 'phev_usable_battery_level', pct],
    ['sensor.rav4_total_range', '690', 'total_range', km],
    ['sensor.rav4_fuel_range', '620', 'fuel_range', km],
    ['sensor.rav4_battery_range', '70', 'battery_range', km],
    ['sensor.rav4_fuel_level', '58', 'fuel_level', pctOnly],
    ['binary_sensor.rav4_hood', 'off', 'hood', { device_class: 'door' }],
    ['lock.rav4_lock', 'locked'],
    ['sensor.rav4_odometer', '12040', 'odometer', km],
  ],
};

/** A Kuga on Ford's (marq24's fordpass), diesel: its 12 V battery wears the battery's class on a car that burns fuel. */
export const KUGA: CarFixture = {
  device: 'd-kuga',
  name: 'Kuga',
  platform: 'fordpass',
  seeds: [
    ['sensor.fordpass_kuga_battery', '79', 'battery', pct],
    ['sensor.fordpass_kuga_fuel', '33', 'fuel', pctOnly],
    ['sensor.fordpass_kuga_fuelrange', '310', 'fuelrange', km],
    ['sensor.fordpass_kuga_oil', '12', 'oil', pctOnly],
    ['sensor.fordpass_kuga_exhaustfluidlevel', '64', 'exhaustfluidlevel', pctOnly],
    ['sensor.fordpass_kuga_odometer', '52310', 'odometer', km],
    ['lock.fordpass_kuga_doorlock', 'locked', 'doorlock'],
  ],
};

/** A C-Class on Mercedes-Benz's (mbapi2020): its tank and its range on it, its AdBlue, its oil, its warning. */
export const C_CLASS: CarFixture = {
  device: 'd-c-class',
  name: 'C 220 d',
  platform: 'mbapi2020',
  seeds: [
    ['sensor.c_220_d_fuel_level', '72', 'tanklevelpercent', pctOnly],
    ['sensor.c_220_d_range_liquid', '780', 'rangeliquid', km],
    [
      'binary_sensor.c_220_d_liquid_range_critical',
      'off',
      'liquidrangecritical',
      { device_class: 'problem' },
    ],
    ['sensor.c_220_d_adblue_level', '40', 'tankleveladblue', pctOnly],
    ['sensor.c_220_d_oil_level', '85', 'oillevel', pctOnly],
    ['sensor.c_220_d_odometer', '45120', 'odometer', km],
    ['lock.c_220_d_lock', 'locked', 'lock'],
  ],
};

/** A 208 on Stellantis's, petrol: its tank, its range on it, its 12 V battery, its maintenance in km and days. */
export const PEUGEOT: CarFixture = {
  device: 'd-208',
  name: 'Peugeot 208',
  platform: 'stellantis_vehicles',
  seeds: [
    ['sensor.peugeot_208_fuel', '9', 'fuel', pctOnly],
    ['sensor.peugeot_208_fuel_range', '58', 'fuel_autonomy', km],
    ['sensor.peugeot_208_service_battery', '78', 'service_battery_voltage', pct],
    ['sensor.peugeot_208_mileage', '41290', 'mileage', km],
    ['sensor.peugeot_208_mileage_before_maintenance', '1240', 'mileage_before_maintenance', km],
    ['sensor.peugeot_208_days_before_maintenance', '41', 'days_before_maintenance', days],
    ['lock.peugeot_208_doors', 'locked'],
    ['device_tracker.peugeot_208_location', 'not_home'],
  ],
};

/**
 * A Golf on an integration the card does not know: its tank, its range on it (an end a range's shares) and the whole,
 * its AdBlue, its oil, its next service, read by the ends of their ids.
 */
export const GOLF: CarFixture = {
  device: 'd-golf',
  name: 'Golf',
  platform: 'golf_bridge',
  seeds: [
    ['sensor.golf_fuel_level', '35', undefined, pctOnly],
    ['sensor.golf_fuel_range', '380', undefined, km],
    ['sensor.golf_total_range', '380', undefined, km],
    ['sensor.golf_adblue_range', '2100', undefined, km],
    ['sensor.golf_oil_level', '70', undefined, pctOnly],
    ['sensor.golf_distance_to_service', '0', undefined, km],
    ['lock.golf_doors', 'locked'],
  ],
};

export const FUEL_CARS: readonly CarFixture[] = [
  SPORTAGE,
  NIRO,
  OCTAVIA,
  XC60,
  CLIO,
  RAV4,
  KUGA,
  C_CLASS,
  PEUGEOT,
  GOLF,
];

/** A washer on a smart plug: a device with a battery-less life, never a car. */
const WASHER: CarFixture = {
  device: 'd-washer',
  name: 'Washer',
  platform: 'home_connect',
  seeds: [['sensor.washer_operation_state', 'run', 'operation_state']],
};

export const CARS: readonly CarFixture[] = [TESLA, KIA, RENAULT, VOLVO, MG, VW, BMW];

const STAMP = '2026-11-04T11:47:12+00:00';

/** A house of these cars (and a washer), as Home Assistant's registries and states say them. */
export function carHouse(cars: readonly CarFixture[] = CARS): HomeAssistant {
  const all = [...cars, WASHER];
  const states: Record<string, HassEntity> = {};
  const entities: Record<string, unknown> = {};
  for (const car of all)
    for (const [id, state, key, attributes = {}, category] of car.seeds) {
      states[id] = {
        entity_id: id,
        state,
        attributes: {
          friendly_name: `${car.name} ${id.split('.')[1]?.replace(/_/g, ' ')}`,
          ...attributes,
        },
        last_changed: STAMP,
        last_updated: STAMP,
        context: { id: '', parent_id: null, user_id: null },
      };
      entities[id] = {
        entity_id: id,
        device_id: car.device,
        platform: car.platform,
        labels: [],
        ...(key ? { translation_key: key } : {}),
        ...(category ? { entity_category: category } : {}),
      };
    }
  return {
    language: 'en',
    locale: {
      language: 'en',
      number_format: 'language',
      time_format: '24',
      first_weekday: 'monday',
      time_zone: 'server',
    },
    states,
    entities,
    devices: Object.fromEntries(
      all.map((car) => [car.device, { id: car.device, name: car.name, name_by_user: null }]),
    ),
    areas: {},
    config: { unit_system: { temperature: '°C', length: 'km' }, time_zone: 'UTC' },
    themes: { darkMode: false, themes: {} },
    user: { id: 'u', name: 'U', is_admin: true },
    localize: (key: string) => key,
    formatEntityState: (s: HassEntity) =>
      s.state.charAt(0).toUpperCase() + s.state.slice(1).replace(/_/g, ' '),
    hassUrl: (path: string) => `http://ha.example${path}`,
    callService: () => Promise.resolve(),
    callWS: () => new Promise(() => undefined),
  } as unknown as HomeAssistant;
}
