import { describe, expect, it } from 'vitest';
import { CHART_DEFAULTS } from '@fluvy/core';
import { TABS } from '@fluvy/cards/panel/model';
import {
  AT,
  columns,
  DEFAULT_CHARTS,
  deviceFor,
  frameWidth,
  parseState,
  parseView,
  samePage,
  serialize,
} from './state.js';

const parse = (query: string) => parseState(new URLSearchParams(query));

describe('the demo state', () => {
  it('starts on the overview, a phone, English, the light mode and Blaze', () => {
    expect(parse('')).toEqual({
      view: { kind: 'overview' },
      mode: 'light',
      device: 'phone',
      language: 'en',
      look: { palette: 'blaze', shape: 'soft', pills: 'round' },
      charts: DEFAULT_CHARTS,
      at: AT,
    });
    expect(parse('mode=dark').mode).toBe('dark');
    // the link pins the mode and the device: a shared link opens as it was seen
    expect(serialize(parse('')).toString()).toBe('mode=light&device=phone');
    expect(serialize(parse('palette=linen')).toString()).toBe(
      'mode=light&device=phone&palette=linen',
    );
  });

  it('shows the device the visitor is on, until the link says', () => {
    expect(deviceFor(1440)).toBe('desktop');
    expect(deviceFor(1024)).toBe('tablet');
    expect(deviceFor(412)).toBe('phone-l');
    expect(deviceFor(360)).toBe('phone');
    expect(parseState(new URLSearchParams(''), 1440).device).toBe('desktop');
    expect(parseState(new URLSearchParams('device=phone'), 1440).device).toBe('phone');
  });

  it('round-trips every choice through the playground’s parameters', () => {
    for (const query of [
      'panel=scope&mode=dark&device=tablet&lang=es&palette=volt&shape=round&pills=soft',
      'sheet=energy&mode=light&device=desktop',
      'history=1&moment=week&mode=light&device=phone',
      'activity=1&mode=dark&device=phone&at=2026-01-01T08%3A00%3A00',
      'mode=light&device=phone&accent=%23ff4a1a&character=vivid&base=cool&fill=solid&highlight=%23e2ff3d',
    ])
      expect(serialize(parse(query)).toString()).toBe(query);
  });

  it('opens every tab of the settings panel, as the panel has them', () => {
    for (const tab of TABS) expect(parse(`panel=${tab}`).view).toEqual({ kind: 'panel', tab });
    expect(TABS).toContain('charts');
    expect(TABS).toContain('wall');
    expect(serialize(parse('panel=charts&mode=dark&device=phone')).toString()).toBe(
      'panel=charts&mode=dark&device=phone',
    );
  });

  it('reads the house’s chart settings as the playground does, and links only what is not the factory’s', () => {
    const soft = parse(`charts=${encodeURIComponent('{"style":"soft","gauge":"liquid"}')}`);
    expect(soft.charts.settings).toEqual({ ...CHART_DEFAULTS, style: 'soft', gauge: 'liquid' });
    expect(serialize(soft).get('charts')).toBe('{"style":"soft","gauge":"liquid"}');
    // an unknown word is its default; the factory's settings put nothing in the link
    expect(parse('charts={"style":"neon","line":"bold"}').charts.settings).toEqual({
      ...CHART_DEFAULTS,
      line: 'bold',
    });
    expect(serialize(parse('charts={"style":"classic"}')).has('charts')).toBe(false);
    expect(parse('charts=nonsense').charts).toEqual(DEFAULT_CHARTS);
    // the house's sets of series colours, one of them worn
    const sea = {
      id: 'sea',
      name: 'Sea',
      colours: ['#1d4ed8', '#0f766e', '#7c3aed', '#0e7490', '#be185d', '#4d7c0f'],
    };
    const worn = parse(
      `charts=${encodeURIComponent(JSON.stringify({ series: 'sea', sets: [sea] }))}`,
    );
    expect(worn.charts).toEqual({ settings: { ...CHART_DEFAULTS, series: 'sea' }, sets: [sea] });
    expect(parse(serialize(worn).toString()).charts).toEqual(worn.charts);
  });

  it('keeps the playground’s width as one column at that width', () => {
    const state = parse('width=392&device=desktop');
    expect(frameWidth(state)).toBe(392);
    expect(columns(state)).toBe(1);
    expect(frameWidth(parse('device=tablet'))).toBe(472);
    expect(columns(parse('device=tablet'))).toBe(2);
  });

  it('falls back to the defaults on nonsense', () => {
    const state = parse(
      'panel=nope&device=watch&width=9000&palette=neon&shape=hex&lang=xx&at=never',
    );
    expect(state.view).toEqual({ kind: 'panel', tab: 'appearance' });
    expect(state.device).toBe('phone');
    expect(state.frameWidth).toBeUndefined();
    expect(state.look).toEqual({ palette: 'blaze', shape: 'soft', pills: 'round' });
    expect(state.language).toBe('en');
    expect(state.at).toBe(AT);
    expect(parse('accent=notacolour').look.palette).toBe('blaze');
  });

  it('carries a Home Assistant path from Pages’ fallback', () => {
    expect(parse('path=%2Flogbook').path).toBe('/logbook');
    expect(serialize(parse('path=%2Flogbook')).has('path')).toBe(false);
  });

  it('opens a card’s page by its short name, and one of its layouts', () => {
    expect(parse('card=tile').view).toEqual({ kind: 'card', card: 'tile' });
    expect(parse('card=tile&layout=compact').view).toEqual({
      kind: 'card',
      card: 'tile',
      layout: 'compact',
    });
    // a layout the card does not have is no layout; a card there is not is the overview
    expect(parse('card=tile&layout=hero').view).toEqual({ kind: 'card', card: 'tile' });
    expect(parse('card=nope').view).toEqual({ kind: 'overview' });
    // the card's page with the look the link wears, back as it was given
    for (const query of [
      'card=tile&layout=mini&mode=dark&device=desktop&lang=de&palette=linen',
      'card=calendar&layout=month-day&mode=light&device=phone',
      'card=energy-flow&mode=light&device=tablet&shape=round',
    ])
      expect(serialize(parse(query)).toString()).toBe(query);
  });

  it('names every page of the menu in its own words, and reads them back', () => {
    for (const query of [
      'cards=1&mode=light&device=phone',
      'themes=1&mode=dark&device=desktop',
      'dashboard=auto&mode=light&device=phone',
      'dashboard=auto&view=room-living&mode=light&device=phone',
      'sheet=home&mode=light&device=phone',
      'sheet=energy&mode=dark&device=tablet',
    ])
      expect(serialize(parse(query)).toString()).toBe(query);
    expect(parse('dashboard=auto').view).toEqual({ kind: 'auto', view: 'home' });
    expect(parse('dashboard=auto&view=../../etc').view).toEqual({ kind: 'auto', view: 'home' });
    // the playground's other dashboards are its own: here the overview
    expect(parse('dashboard=home').view).toEqual({ kind: 'overview' });
  });

  it('keeps every link the demo was shared by before: each opens what it opened', () => {
    expect(parse('sheet=home').view).toEqual({ kind: 'sheet', name: 'home' });
    expect(parse('sheet=animated&palette=linen').view).toEqual({ kind: 'sheet', name: 'animated' });
    expect(parse('panel=charts&palette=linen').view).toEqual({ kind: 'panel', tab: 'charts' });
    expect(parse('history=1&palette=linen').view).toEqual({ kind: 'history' });
    expect(parse('activity=1&palette=linen').view).toEqual({ kind: 'activity' });
    // the README's links that named no page open the overview, on the device and palette they name
    const front = parse('palette=linen&device=desktop');
    expect(front.view).toEqual({ kind: 'overview' });
    expect(front.device).toBe('desktop');
    expect(front.look.palette).toBe('linen');
  });

  it('reads the page alone for back and forward, and tells a card’s layouts one page', () => {
    expect(parseView(new URLSearchParams('card=fan&layout=compact&mode=dark'))).toEqual({
      kind: 'card',
      card: 'fan',
      layout: 'compact',
    });
    expect(
      samePage({ kind: 'card', card: 'fan' }, { kind: 'card', card: 'fan', layout: 'compact' }),
    ).toBe(true);
    expect(samePage({ kind: 'card', card: 'fan' }, { kind: 'card', card: 'tile' })).toBe(false);
    expect(samePage({ kind: 'sheet', name: 'home' }, { kind: 'sheet', name: 'energy' })).toBe(
      false,
    );
  });
});
