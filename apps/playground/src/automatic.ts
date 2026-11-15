import type { HomeAssistant } from '@fluvy/core';
import { generate } from '../../../packages/cards/src/strategy/generate.js';
import { templateById, TEMPLATES } from '../../../packages/cards/src/strategy/templates.js';
import type { FluvyStrategyConfig } from '../../../packages/cards/src/strategy/types.js';
import type { FrameSpec } from './scenes.js';

/**
 * The automatic dashboard a page asks for: Home's, or another template's (`&template=rooms`), with its options as its
 * raw configuration writes them (`&options={"rooms_as":"tabs"}`).
 */
export function automaticConfig(params: URLSearchParams): FluvyStrategyConfig {
  const template =
    TEMPLATES.find((known) => known.id === params.get('template')) ?? templateById('home');
  let options: unknown;
  try {
    options = JSON.parse(params.get('options') ?? '{}');
  } catch {
    options = {};
  }
  return { ...(typeof options === 'object' ? options : {}), type: template.type };
}

/**
 * A view of an automatic dashboard (`?dashboard=auto&view=home`), as its own strategy builds it from the house of
 * every sheet, or from a sheet's own (`&house=room-tabs`): each section a frame of its cards, each card at the columns
 * the strategy gives it. The page's other views are reached through `fluvyAutomaticView` (main.ts), as a phone opens
 * another tab.
 */
export async function automaticFrames(
  hass: HomeAssistant,
  path: string,
  config: FluvyStrategyConfig,
): Promise<readonly FrameSpec[]> {
  const { views } = await generate(config, hass);
  const view = views.find((candidate) => candidate.path === path) ?? views[0];
  if (!view) return [];
  return view.sections
    .filter((section) => section.cards.length)
    .map((section, index) => ({
      title: `${view.title} · ${index + 1}`,
      cards: section.cards.map((card) =>
        typeof card.grid_options?.columns === 'number'
          ? { ...card, cols: card.grid_options.columns }
          : card,
      ),
    }));
}

/** An automatic dashboard's view as its header lists it: its path, its name and icon, and whether it is a tab. */
export interface AutomaticView {
  readonly path: string;
  readonly title: string;
  readonly icon: string;
  readonly tab: boolean;
}

/** An automatic dashboard's views as its strategy builds them from the house: each by its path, its tabs first. */
export async function automaticViews(
  hass: HomeAssistant,
  config: FluvyStrategyConfig,
): Promise<readonly AutomaticView[]> {
  const { views } = await generate(config, hass);
  return views.map(({ path, title, icon, subview }) => ({ path, title, icon, tab: !subview }));
}
