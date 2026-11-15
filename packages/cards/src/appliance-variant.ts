import type { LovelaceCardConfig } from '@fluvy/core';

/*
 * The layout an appliance card draws, as its config asks for it: read by its family's heights and by a head's lines
 * (`shared/head-lines.ts`), which every card's base reads, so it stands in a module of its own and stays tiny.
 */

export type ApplianceVariant = 'full' | 'compact' | 'ring' | 'row';
export const APPLIANCE_VARIANTS: readonly ApplianceVariant[] = ['full', 'compact', 'ring', 'row'];

/** The kinds a card draws as a row where it names no layout (what lives on a plug), and the hood's compact one. */
const ROW_KINDS = ['microwave', 'kettle', 'toaster', 'blender', 'sandwich_maker', 'appliance'];

/** The layout a config asks for: its own, else its kind's where it names one, else the whole card. */
export function applianceVariant(config: LovelaceCardConfig | undefined): ApplianceVariant {
  const v = config?.['variant'];
  if ((APPLIANCE_VARIANTS as readonly unknown[]).includes(v)) return v as ApplianceVariant;
  const kind = config?.['kind'];
  return kind === 'hood' ? 'compact' : ROW_KINDS.includes(kind as string) ? 'row' : 'full';
}
