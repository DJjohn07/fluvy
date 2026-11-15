// @vitest-environment happy-dom
import { ensureLanguage, type HomeAssistant } from '@fluvy/core';
import { describe, expect, it } from 'vitest';
import { FluvyBarsCard } from '../bars/bars-card.js';
import { FluvyChipsCard } from '../chips/chips-card.js';
import { FluvyEntitiesCard } from '../entities/entities-card.js';
import { FluvyExpanderCard } from '../expander/expander-card.js';
import { FluvyHeadingCard } from '../heading/heading-card.js';
import { FluvyStatTilesCard } from '../stat-tiles/stat-tiles-card.js';
import { FluvyWallScreensaver } from '../wall/screensaver.js';

/**
 * #193: the words Fluvy writes into a card the picker adds (the Chips card's two chips, the titles of the Entities,
 * Expander, Heading, Bars and Stat tiles cards) and the name a screen reader hears for the wall's screensaver were
 * English on every dashboard: they are the dashboard's language's now.
 */
await ensureLanguage('de');
const hass = (language: string): HomeAssistant =>
  ({ language, states: {}, themes: { darkMode: false } }) as unknown as HomeAssistant;

const words = (language: string): unknown[] => {
  const at = hass(language);
  return [
    FluvyChipsCard.getStubConfig(at).chips?.map((chip) => chip.name),
    FluvyEntitiesCard.getStubConfig(at, ['light.lamp']).title,
    FluvyExpanderCard.getStubConfig(at, ['light.lamp']).title,
    FluvyHeadingCard.getStubConfig(at, ['light.lamp']).title,
    FluvyBarsCard.getStubConfig(at, ['sensor.level']).title,
    FluvyStatTilesCard.getStubConfig(at, ['sensor.power']).title,
  ];
};

customElements.define('fluvy-first-words-screensaver', FluvyWallScreensaver);

describe('a new card’s first words', () => {
  it('are English on an English dashboard, as they were', () => {
    expect(words('en')).toEqual([
      ['Home', 'Energy'],
      'Devices',
      'More',
      'Living room',
      'Levels',
      'Stats',
    ]);
  });

  it('are the dashboard’s language on any other', () => {
    expect(words('de')).toEqual([
      ['Zuhause', 'Energie'],
      'Geräte',
      'Mehr',
      'Wohnzimmer',
      'Stände',
      'Werte',
    ]);
  });
});

describe('the screensaver', () => {
  it('is named in the wall’s language for a screen reader', async () => {
    const saver = document.createElement('fluvy-first-words-screensaver') as FluvyWallScreensaver;
    saver.clock = false;
    saver.hass = hass('de');
    document.body.append(saver);
    await saver.updateComplete;
    expect(saver.renderRoot.querySelector('dialog')?.getAttribute('aria-label')).toBe(
      'Bildschirmschoner',
    );
    saver.remove();
  });
});
