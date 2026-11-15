import type { FrameSpec, SheetSpec } from '../scenes.js';

/**
 * A device's state is always said (1.22, #196). Lock, Cover (a blind, a garage, a valve), Alarm and Vacuum in a narrow
 * column: where the badge cannot stand beside the name, its word leads the line ("Unlocked · 21:32", in the warning's
 * ink), at 152, 172 and 211 — before 1.22 they said their state nowhere there.
 */

const LOCK = 'custom:fluvy-lock-card';
const COVER = 'custom:fluvy-cover-card';
const ALARM = 'custom:fluvy-alarm-card';
const VACUUM = 'custom:fluvy-vacuum-card';

/** A minute before the playground's clock: "Since …" says when the state began. */
const MINUTES = 60;

const PANEL = { supported_features: 1 | 2, code_format: null, code_arm_required: false };
const ROBOT = { supported_features: 8192 | 16 | 8 | 4 | 64, battery_level: 76 };

/** The four cards that said their state nowhere in a narrow column, as a dashboard holds them, half a section each. */
const unsaid = (): FrameSpec['cards'] =>
  [
    { type: LOCK, entity: 'lock.st_front', name: 'Front door lock', variant: 'compact' },
    { type: ALARM, entity: 'alarm_control_panel.st_loud', variant: 'compact' },
    { type: COVER, entity: 'cover.st_blind', variant: 'compact' },
    { type: VACUUM, entity: 'vacuum.st_robot', variant: 'compact' },
  ].map((card) => ({ ...card, cols: 6 }));

export const sheet: SheetSpec = {
  states: [
    [
      'lock.st_front',
      'unlocked',
      { friendly_name: 'Front door', changed_by: 'Marta' },
      15 * MINUTES,
    ],
    [
      'cover.st_blind',
      'open',
      {
        friendly_name: 'Living room blind',
        device_class: 'blind',
        current_position: 60,
        supported_features: 15,
      },
      40 * MINUTES,
    ],
    [
      'alarm_control_panel.st_loud',
      'triggered',
      { friendly_name: 'House alarm', previous_state: 'armed_away', ...PANEL },
      2 * MINUTES,
    ],
    ['vacuum.st_robot', 'cleaning', { friendly_name: 'Robot vacuum', ...ROBOT }, 25 * MINUTES],
  ],
  frames: [
    // the fix, for everyone: the state leads the line where its badge has no room beside the name
    {
      title: 'Narrow · the state leads the line at 152',
      width: 320,
      cards: unsaid(),
    },
    {
      title: 'Narrow · the state leads the line at 172',
      cards: unsaid(),
    },
    {
      title: 'Narrow · the state leads the line at 211',
      width: 211,
      cards: unsaid().map((card) => ({ ...card, cols: 12 })),
    },
  ],
};
