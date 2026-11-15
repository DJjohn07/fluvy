// @vitest-environment happy-dom
import type { HaFormSchemaItem, HomeAssistant } from '@fluvy/core';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { familiesDefined } from '../index.js';
import {
  cardForm,
  drawEditor,
  listTitles,
  nextConfig,
  shownNames,
} from '../shared/fixtures/editor.js';
import { FluvyLockCard } from './lock-card.js';

// the index fetches the lazy families: they land before this file's page goes
afterAll(() => familiesDefined);
afterEach(() => document.body.replaceChildren());

describe('the lock card’s editor', () => {
  const editor = async (config: Record<string, unknown>) =>
    drawEditor(await FluvyLockCard.getConfigElement(), {
      type: 'custom:fluvy-lock-card',
      entity: 'lock.front',
      ...config,
    });

  it('offers its rows on the full card, and none on the compact one, which draws none', async () => {
    const full = await editor({ rows: ['binary_sensor.door'] });
    expect(shownNames(cardForm(full).schema)).toContain('show_rows');
    expect(listTitles(full)).toEqual(['Rows']);
    const compact = await editor({ variant: 'compact', rows: ['binary_sensor.door'] });
    expect(shownNames(cardForm(compact).schema)).not.toContain('show_rows');
    expect(listTitles(compact)).toEqual([]);
  });

  it('offers a colour for each of its states, in Home Assistant’s words, and writes those chosen alone (1.22, #196)', async () => {
    const drawn = await editor({});
    const form = cardForm(drawn);
    const group = form.schema.find((item) => item.name === 'state_colors')!;
    expect(group.schema?.map((field) => field.name)).toEqual([
      'locked',
      'unlocked',
      'locking',
      'unlocking',
      'open',
      'opening',
      'jammed',
    ]);
    // each named in Home Assistant's own word where it has one, else the state tidied
    drawn.hass = {
      localize: (key: string) =>
        key === 'component.lock.entity_component._.state.unlocked' ? 'Entriegelt' : '',
    } as unknown as HomeAssistant;
    const label = (form as unknown as { computeLabel: (item: HaFormSchemaItem) => string })
      .computeLabel;
    expect(group.schema?.map((field) => label(field)).slice(0, 2)).toEqual([
      'Locked',
      'Entriegelt',
    ]);
    // the style is a choice only while the colour shows
    expect(shownNames(form.schema)).toContain('tint');
    expect(shownNames(form.schema)).not.toContain('tint_style');
    expect(shownNames(cardForm(await editor({ tint: 'on' })).schema)).toContain('tint_style');
    let next = nextConfig(drawn);
    form.change('state_colors', { unlocked: 'danger', locked: '' });
    expect((await next)['state_colors']).toEqual({ unlocked: 'danger' });
    // every state cleared: the key leaves the config, as a cleared field does
    const chosen = await editor({ state_colors: { unlocked: 'danger' } });
    next = nextConfig(chosen);
    cardForm(chosen).change('state_colors', { unlocked: '' });
    expect(await next).not.toHaveProperty('state_colors');
  });
});
