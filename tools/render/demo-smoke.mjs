#!/usr/bin/env node
/**
 * The demo, checked as a visitor would find it (a built site served by `vite preview`, or the dev server):
 * - the overview shows Fluvy and its frames, a palette recolours the page, a device changes the columns, dark mode and a
 *   language reach the cards in place, a card asking for more-info is answered with a notice and no navigation;
 * - every card has a page that mounts its examples and nothing else, without an error; every example's "View YAML"
 *   opens on exactly the docs' YAML of it (`toYaml` of the gallery's example, read from `tools/docs`), Copy writes that
 *   text and says it did, Escape closes the panel and gives the focus back;
 * - a link to a card's layout opens on that layout, marked; back and forward move between pages; the menu (the rail on
 *   a desktop, the drawer on a phone) and the search open cards, and say when they find none;
 * - every family of the showcase mounts at a desktop's width and a phone's, nothing wider than the screen, and between
 *   them the families draw every card of the catalogue; the automatic dashboard builds its views;
 * - the stand-in answers as the playground's does, one sentinel per thing it holds: the registries (a printer, a
 *   camera's motion, an area's lights, a room), the repairs and the integrations' words (the alerts' counts), stored
 *   data, statistics, the Energy date pickers' collections (a strip moving its followers), a frame's own house (an
 *   appliance, a guest, another Energy dashboard);
 * - the settings panel opens on every tab inside the demo (Charts and Wall too), its address following; the house's
 *   chart settings come from the link (`charts=`) or from the Charts tab, and reach a card that names no style;
 * - the gauges that move run, and rest when the visitor asks for less motion; the Web page card's page loads from the
 *   demo's own files; the Items card lists its rows; a stat tile's tap is answered; an on/off bulb draws no ruler;
 * - the language field names every language once, by its own name, and Portuguese (Portugal), Portuguese (Brazil)
 *   and Japanese each speak their own words;
 * - and the page reports no error, no failed request.
 *   DEMO=http://127.0.0.1:4173/fluvy/ node tools/render/demo-smoke.mjs
 * Exit code 1 on any failure.
 */
import { chromium } from 'playwright';
import { launchOptions } from './lib.mjs';
// the docs' own gallery and YAML writer: what every card's page must show, word for word
import { drawn, GALLERY, shortName } from '../docs/src/gallery.ts';
import { toYaml } from '../docs/src/yaml.ts';

const DEMO = process.env.DEMO ?? 'http://127.0.0.1:5185/fluvy/';
/** The families of the showcase, in the menu's order. */
const FAMILIES = [
  'home',
  'devices',
  'climate',
  'vehicles',
  'energy',
  'charts',
  'media',
  'time',
  'helpers',
];
const DESKTOP = { width: 1400, height: 1000 };
const PHONE = { width: 360, height: 800 };

const browser = await chromium.launch(launchOptions);
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const errors = [];
const open = async (query, viewport = DESKTOP, options = {}) => {
  const page = await browser.newPage({ viewport, ...options });
  page.on('pageerror', (error) => errors.push(`${query}: ${error}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${query}: ${message.text()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${query}: ${response.status()} ${response.url()}`);
  });
  await page.goto(`${DEMO}${query ? `?${query}` : ''}`);
  await page.waitForSelector('html[data-ready="1"]', { timeout: 30000 });
  await page.waitForTimeout(600);
  return page;
};
const accent = (page) =>
  page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--fluvy-accent').trim(),
  );
const frames = (page) => page.locator('#stage [data-frame]').count();
const frame = (page, name) => page.locator(`#stage [data-frame="${name}"]`);
/** What a frame says, through its cards' shadow roots; '' where there is no such frame. */
const words = (page, name) =>
  page.evaluate((name) => {
    let text = '';
    // a text's words; an element's children and its shadow root's (a style's text is not words)
    const walk = (node) => {
      if (node.nodeType === 3) text += `${node.textContent} `;
      if ((node.nodeType !== 1 && node.nodeType !== 11) || node.localName === 'style') return;
      if (node.shadowRoot) walk(node.shadowRoot);
      for (const child of node.childNodes) walk(child);
    };
    const el = document.querySelector(`#stage [data-frame="${name}"]`);
    if (el) walk(el);
    return text.replace(/\s+/g, ' ').trim();
  }, name);
/** The demo's fields: the device beside a page's title, the language in the top bar. */
const FIELDS = {
  device: 'fluvy-demo-head fluvy-select.hd-device',
  language: 'fluvy-demo-shell fluvy-select.dm-language',
};
/** Picks an option of one of the demo's fields (`device`, `language`) by its label. */
const choose = async (page, field, label) => {
  const select = page.locator(FIELDS[field]);
  // the field in view at once: a list closes on a scroll, and the page scrolls smoothly to a field out of view
  await select.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await select.locator('.fv-select').click();
  await select.locator('[role="option"]', { hasText: label }).first().click();
  await page.waitForTimeout(400);
};
const toast = (page) => page.locator('fluvy-demo-shell .dm-toast').count();
/** The page is no wider than the screen. */
const overflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
/** The page the address names now. */
const query = (page) => new URL(page.url()).searchParams;
/**
 * Opens an entry of the menu by its link (`card=fan&`, `sheet=charts&`): the rail on a desktop, the drawer from the menu
 * button on a phone, the group holding it opened first where it is closed.
 */
const fromMenu = async (page, link, group) => {
  const phone = (page.viewportSize()?.width ?? 0) < 1024;
  if (phone) await page.locator('fluvy-demo-shell .dm-menu-button').click();
  const menu = page.locator(`fluvy-demo-shell ${phone ? '.dm-drawer' : '.dm-rail'}`);
  const entry = menu.locator(`a[href*="${link}"]`);
  if (group && !(await entry.count()))
    await menu.locator('button.dm-item', { hasText: group }).first().click();
  await entry.first().click();
  await page.waitForTimeout(800);
};
/** The YAML panel's text as a person would select it (the gutter's numbers are not text), and whether it is open. */
const panel = (page) =>
  page.evaluate(() => {
    const root = document.querySelector('fluvy-demo-yaml')?.shadowRoot;
    const dialog = root?.querySelector('dialog');
    return {
      open: Boolean(dialog?.open),
      text: root?.querySelector('.ym-code')?.textContent ?? '',
      copy: root?.querySelector('.ym-copy')?.textContent?.trim() ?? '',
    };
  });
/** A frame's chart (its first card's drawing): the style it is drawn in and its paths (the ids a page counts left out). */
const chartOf = (page, name) =>
  frame(page, name)
    .locator('svg.fc-chart')
    .first()
    .evaluate((svg) =>
      [
        svg.getAttribute('class'),
        ...[...svg.querySelectorAll('path')].map((path) => path.getAttribute('d')),
      ].join('\n'),
    );

/* ---------- the overview and the chrome ---------- */
{
  const page = await open('');
  check(
    'the overview shows what Fluvy is and its frames',
    (await page.locator('fluvy-demo-head h1').count()) === 1 && (await frames(page)) >= 6,
    `${await frames(page)} frames`,
  );
  check('the look is on the page', (await accent(page)) !== '', await accent(page));
  const before = await accent(page);
  await page.locator('fluvy-demo-shell .dm-palette-button').click();
  await page.locator('fluvy-demo-shell .dm-pop .dm-dot[aria-label="Volt"]').click();
  await page.waitForTimeout(300);
  const after = await accent(page);
  check(
    'a palette recolours the page without a reload',
    after !== '' && after !== before,
    `${before} → ${after}`,
  );
  check('…and the URL says so', page.url().includes('palette=volt'), page.url());
  await page.keyboard.press('Escape');
  // the overview opens on the visitor's own device (a desktop here): the device field changes the columns
  const lanes = () => page.locator('#stage .demo-lane').count();
  const desktop = await lanes();
  await choose(page, 'device', 'Phone');
  const phone = await lanes();
  check(
    'a device changes the columns',
    desktop === 2 && phone === 1,
    `${desktop} → ${phone} lanes`,
  );
  await page.locator('fluvy-demo-shell .dm-top .dm-mode').click();
  await page.waitForTimeout(300);
  check(
    'dark mode reaches the cards',
    await page
      .locator('#stage [data-frame] > *')
      .first()
      .evaluate((el) => el.hasAttribute('dark')),
  );
  const languages = await page
    .locator(FIELDS.language)
    .evaluate((select) => select.options.map((option) => option.label));
  check(
    'the language field names every language once, by its own name',
    languages.length >= 10 &&
      new Set(languages).size === languages.length &&
      languages.includes('Português (Brasil)') &&
      languages.includes('Português (Portugal)') &&
      languages.includes('日本語'),
    languages.join(', '),
  );
  await choose(page, 'language', 'Español');
  await page.waitForTimeout(300);
  check(
    'the language changes in place, the menu with it',
    (await page.locator('html').getAttribute('lang')) === 'es' &&
      page.url().includes('lang=es') &&
      (await page
        .locator('fluvy-demo-shell .dm-rail', { hasText: 'Todas las tarjetas' })
        .count()) === 1,
  );
  // a card asking for more-info: a notice, and the page stays where it is
  const url = page.url();
  await page.evaluate(() => {
    const card = document.querySelector('#stage [data-frame] > *');
    card?.dispatchEvent(
      new CustomEvent('hass-more-info', {
        detail: { entityId: 'light.kitchen' },
        bubbles: true,
        composed: true,
      }),
    );
  });
  await page.waitForTimeout(200);
  check(
    'more-info becomes a notice, not a dialog',
    (await toast(page)) === 1 && page.url() === url,
  );
  await page.close();
}
{
  const page = await open('sheet=energy');
  check(
    'a sheet deep link mounts its frames',
    (await frames(page)) >= 1,
    `${await frames(page)} frames`,
  );
  await page.close();
}

/* ---------- every card's page: its examples alone, each one's YAML the docs' ---------- */
{
  const page = await open('cards=1', DESKTOP, {
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const index = await page.locator('fluvy-demo-index .ix-card').count();
  check(
    'the cards page lists every card of the gallery',
    index === Object.keys(GALLERY).length,
    `${index} of ${Object.keys(GALLERY).length}`,
  );
  const wrong = [];
  let examples = 0;
  for (const [tag, example] of Object.entries(GALLERY)) {
    const short = shortName(tag);
    const expected = drawn(tag, example);
    // opened as the menu, the search and the cards page open it
    await page.evaluate(
      (card) =>
        document.dispatchEvent(
          new CustomEvent('demo-go', { detail: { kind: 'card', card }, bubbles: true }),
        ),
      short,
    );
    await page.waitForTimeout(150);
    const plates = page.locator('#stage fluvy-demo-example');
    const mounted = await plates.count();
    const tags = await page
      .locator('#stage [data-frame] > *')
      .evaluateAll((cards) => cards.map((card) => card.localName));
    if (
      query(page).get('card') !== short ||
      mounted !== expected.length ||
      tags.length !== expected.length ||
      tags.some((name) => name !== tag)
    )
      wrong.push(`${short}: ${mounted} of ${expected.length} [${tags.join(' ')}]`);
    for (const [at, shownExample] of expected.entries()) {
      await plates.nth(at).locator('.ex-yaml').click();
      await page.waitForFunction(
        () => document.querySelector('fluvy-demo-yaml')?.shadowRoot?.querySelector('dialog')?.open,
      );
      if ((await panel(page)).text !== toYaml(shownExample.config))
        wrong.push(`${shownExample.name}: its YAML is not the docs'`);
      examples += 1;
      await page.keyboard.press('Escape');
      await page.waitForFunction(
        () => !document.querySelector('fluvy-demo-yaml')?.shadowRoot?.querySelector('dialog'),
      );
    }
  }
  check(
    `every card's page mounts its examples alone, and each one's YAML is the docs' (${examples} examples)`,
    wrong.length === 0 && examples > Object.keys(GALLERY).length,
    wrong.slice(0, 6).join(' | '),
  );

  // Copy writes the exact text and says so; Escape gives the focus back to the button that opened the panel
  await page.evaluate(() =>
    document.dispatchEvent(
      new CustomEvent('demo-go', { detail: { kind: 'card', card: 'cover' }, bubbles: true }),
    ),
  );
  await page.waitForTimeout(300);
  const button = page.locator('#stage fluvy-demo-example').first().locator('.ex-yaml');
  await button.click();
  await page.waitForTimeout(400);
  await page.locator('fluvy-demo-yaml .ym-copy').click();
  await page.waitForTimeout(200);
  const copied = await page.evaluate(() => window.navigator.clipboard.readText());
  check(
    'Copy writes the YAML, exactly, and says it did',
    copied === toYaml(GALLERY['fluvy-cover-card'].config) && (await panel(page)).copy === 'Copied',
    JSON.stringify((await panel(page)).copy),
  );
  check(
    'the YAML panel keeps the focus inside while it is open',
    await page.evaluate(() => {
      const root = document.querySelector('fluvy-demo-yaml')?.shadowRoot;
      return Boolean(
        root?.activeElement && root.querySelector('dialog')?.contains(root.activeElement),
      );
    }),
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  check(
    'Escape closes it and gives the focus back to "View YAML"',
    !(await panel(page)).open &&
      (await button.evaluate((el) => el.getRootNode().activeElement === el)),
  );
  // the scrim closes it too
  await button.click();
  await page.waitForTimeout(500);
  await page.mouse.click(40, 500);
  await page.waitForTimeout(400);
  check('a tap on the scrim closes it', !(await panel(page)).open);
  await page.close();
}

/* ---------- deep links, back and forward ---------- */
{
  const page = await open('card=fan&layout=compact&palette=linen&mode=dark');
  const marked = page.locator('#stage fluvy-demo-example[marked]');
  const top = await marked.evaluate((el) => el.getBoundingClientRect().top);
  check(
    'a link to a layout opens its card on that layout, marked and in view, in the look it names',
    (await marked.count()) === 1 &&
      (await marked.evaluate((el) => el.layout)) === 'compact' &&
      top >= 64 &&
      top < DESKTOP.height - 200 &&
      query(page).get('palette') === 'linen' &&
      query(page).get('mode') === 'dark',
    `top ${Math.round(top)}`,
  );
  await fromMenu(page, 'card=tile&', 'Control');
  await fromMenu(page, 'cards=1&');
  check('the menu opens pages, the address following', query(page).get('cards') === '1');
  await page.goBack();
  await page.waitForTimeout(600);
  check(
    'back opens the page before, in the look the visitor wears',
    query(page).get('card') === 'tile' &&
      (await page.locator('fluvy-demo-head h1').textContent()) === 'Tile' &&
      query(page).get('palette') === 'linen',
    page.url(),
  );
  await page.goBack();
  await page.waitForTimeout(600);
  check(
    '…and back again the layout the link named',
    query(page).get('card') === 'fan' &&
      query(page).get('layout') === 'compact' &&
      (await marked.count()) === 1,
    page.url(),
  );
  await page.goForward();
  await page.waitForTimeout(600);
  check('forward opens the next', query(page).get('card') === 'tile', page.url());
  // a layout's chip marks it in place
  await page.locator('fluvy-demo-head .fv-chip', { hasText: 'mini' }).click();
  await page.waitForTimeout(600);
  check(
    'a layout chip marks its example, the page staying',
    query(page).get('layout') === 'mini' &&
      (await marked.evaluate((el) => el.layout)) === 'mini' &&
      (await page.locator('#stage fluvy-demo-example').count()) === 3,
  );
  await page.close();
}

/* ---------- the search and the menu, on a desktop and on a phone ---------- */
{
  const page = await open('');
  const field = page.locator('fluvy-demo-shell .dm-top input[type="search"]');
  await field.fill('thermo');
  await page.waitForTimeout(200);
  const found = await page.locator('fluvy-demo-shell .dm-results [role="option"]').count();
  await field.press('Enter');
  await page.waitForTimeout(800);
  check(
    'on a desktop the search finds a card by its name and Enter opens it',
    found >= 1 && query(page).get('card') === 'thermostat',
    page.url(),
  );
  await field.fill('dimmer');
  await page.waitForTimeout(200);
  const byLine = await page
    .locator('fluvy-demo-shell .dm-results [role="option"] .dm-result__name')
    .allTextContents();
  await field.fill('zzzz');
  await page.waitForTimeout(200);
  check(
    '…by its line too, and says when it finds none',
    byLine.includes('Light') &&
      (await page.locator('fluvy-demo-shell .dm-results .dm-none').textContent()) ===
        'No card found',
    byLine.join(', '),
  );
  await page.close();
}
{
  const page = await open('', PHONE);
  check(
    'a phone has the menu button and no rail',
    (await page.locator('fluvy-demo-shell .dm-menu-button').isVisible()) &&
      !(await page.locator('fluvy-demo-shell .dm-rail').isVisible()),
  );
  await page.locator('fluvy-demo-shell .dm-search-button').click();
  await page.waitForTimeout(400);
  const field = page.locator('fluvy-demo-shell .dm-drawer input[type="search"]');
  check(
    'its search round opens the drawer on the search',
    await field.evaluate((el) => el.getRootNode().activeElement === el),
  );
  await field.fill('energy flow');
  await page.waitForTimeout(200);
  await page.locator('fluvy-demo-shell .dm-drawer [role="option"]').first().click();
  await page.waitForTimeout(800);
  check(
    'on a phone the search opens a card and the drawer closes',
    query(page).get('card') === 'energy-flow' &&
      (await page.locator('fluvy-demo-shell .dm-drawer').count()) === 0,
    page.url(),
  );
  await fromMenu(page, 'card=lock&', 'Security');
  check(
    'on a phone the drawer’s groups open a card',
    query(page).get('card') === 'lock' &&
      (await page.locator('fluvy-demo-shell .dm-drawer').count()) === 0,
    page.url(),
  );
  await page.locator('fluvy-demo-shell .dm-menu-button').click();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  check(
    'Escape closes the drawer and gives the focus back to the menu button',
    (await page.locator('fluvy-demo-shell .dm-drawer').count()) === 0 &&
      (await page
        .locator('fluvy-demo-shell .dm-menu-button')
        .evaluate((el) => el.getRootNode().activeElement === el)),
  );
  // "View YAML" on a phone is the bottom sheet, the whole width
  await page.locator('#stage fluvy-demo-example').first().locator('.ex-yaml').click();
  await page.waitForTimeout(500);
  // the window's width, less a scrollbar's room where the browser keeps one (a phone keeps none)
  const sheet = await page.locator('fluvy-demo-yaml .ym-sheet').evaluate((el) => ({
    ...el.getBoundingClientRect().toJSON(),
    screen: el.closest('dialog')?.clientWidth,
  }));
  check(
    'on a phone "View YAML" is a bottom sheet the whole width',
    sheet.left === 0 && sheet.width === sheet.screen && Math.round(sheet.bottom) === PHONE.height,
    JSON.stringify(sheet),
  );
  check('nothing is wider than a phone', (await overflow(page)) <= 0, `${await overflow(page)} px`);
  await page.close();
}

/* ---------- every family of the showcase, on a desktop and on a phone; every card between them ---------- */
const tagsDrawn = new Set();
let catalogue = [];
for (const viewport of [DESKTOP, PHONE]) {
  const page = await open('', viewport);
  const seen = [];
  for (const family of FAMILIES) {
    await fromMenu(page, `sheet=${family}&`, 'Showcase');
    const shown = query(page).get('sheet');
    const count = await frames(page);
    const wide = await overflow(page);
    if (shown !== family || count < 1 || wide > 0)
      seen.push(`${family}: ${shown}, ${count}, +${wide}px`);
    if (viewport === DESKTOP) {
      // every element of a card's tag, through the shadow roots (a card inside a card counts)
      const tags = await page.evaluate(() => {
        const out = new Set();
        const walk = (node) => {
          for (const el of node.querySelectorAll('*')) {
            out.add(el.localName);
            if (el.shadowRoot) walk(el.shadowRoot);
          }
        };
        walk(document.getElementById('stage'));
        return [...out];
      });
      for (const tag of tags) tagsDrawn.add(tag);
      catalogue = await page.evaluate(() => (window.customCards ?? []).map((card) => card.type));
    }
  }
  check(
    `every family mounts at ${viewport.width}, nothing wider than the screen`,
    seen.length === 0,
    seen.join(' | '),
  );
  await page.close();
}
const missing = catalogue.filter((type) => !tagsDrawn.has(type));
check(
  `the families draw every card of the catalogue (${catalogue.length - missing.length} of ${catalogue.length})`,
  catalogue.length >= 62 && missing.length === 0,
  missing.join(', '),
);

/* ---------- the automatic dashboard ---------- */
{
  const page = await open('dashboard=auto');
  const built = () =>
    page.waitForFunction(() => document.querySelectorAll('#stage [data-frame]').length > 0, null, {
      timeout: 20000,
    });
  await built();
  const views = (await page.locator('fluvy-demo-head .fv-chip').allTextContents()).map((view) =>
    view.trim(),
  );
  await page.locator('fluvy-demo-head .fv-chip', { hasText: /^Energy$/ }).click();
  await page.waitForTimeout(400);
  await built();
  check(
    'the automatic dashboard builds its views from the demo house, a chip each',
    views.length >= 5 && views.includes('Energy') && query(page).get('view') === 'energy',
    views.join(', '),
  );
  await page.close();
}

/* ---------- the stand-in answers as the playground's ---------- */
{
  const sentinels = {
    devices: [
      ['printer/Bambu Lab · printing', 'Progress', 'the registry: a printer'],
      ['appliances/LG · washer spinning', 'Spinning', 'a frame’s own house: an appliance'],
      ['cameras/Cameras · three', 'Motion detected', 'the registry: a camera’s motion'],
      ['lights/Tiles · one brightness', 'Island', 'the registry: an area’s lights'],
    ],
    home: [['rooms/Room · tiles', 'Living room', 'the registry: a room']],
    helpers: [
      [
        'alerts/Tiles',
        'Low batteries Bathroom leak sensor 4',
        'the repairs and the integrations’ words: the alerts’ counts',
      ],
      ['automations/Sheet · new', 'Garden', 'stored data and the areas: a schedule’s targets'],
      ['automations/One lamp · guest', '1 of 2 on', 'a guest’s view of the house'],
    ],
    charts: [['chart/Chart · statistics', 'Lowest', 'the statistics: the Chart card']],
    media: [['remote/Full', 'Netflix', 'the registry and the player’s sources: the remote’s apps']],
    energy: [
      ['usage/A day', 'Solar', 'another Energy dashboard: Energy usage'],
      ['period/Followers', 'Today', 'the Energy date pickers’ collections'],
    ],
  };
  for (const [family, list] of Object.entries(sentinels)) {
    const page = await open(`sheet=${family}`);
    await page.waitForTimeout(1200);
    for (const [name, word, what] of list) {
      const said = await words(page, name);
      check(`${what}: "${name}" says "${word}"`, said.includes(word), said.slice(0, 160));
    }
    if (family === 'media') {
      // a key of the remote reaches the stand-in: the mute goes to the receiver, which says so a moment later
      const mute = frame(page, 'remote/Full')
        .locator('fluvy-remote-card [aria-label="Mute"]')
        .first();
      await mute.click();
      await page.waitForTimeout(600);
      check(
        'a key of the remote reaches the stand-in (the mute flips to Unmute)',
        (await frame(page, 'remote/Full')
          .locator('fluvy-remote-card [aria-label="Unmute"]')
          .count()) === 1,
      );
      // the power round of a television that is off wakes it through the stand-in: its line no longer says Off
      const off = frame(page, 'remote/Off').locator('fluvy-remote-card');
      await off.locator('[aria-label="Turn on"]').first().click();
      await page.waitForTimeout(600);
      check(
        'the power round wakes a television that is off',
        (await off.locator('[aria-label="Turn off"]').count()) === 1,
      );
    }
    if (family === 'energy') {
      check(
        'Energy usage finds its Energy dashboard',
        !(await words(page, 'usage/A day')).includes('No Energy dashboard yet'),
      );
      // the strip steps back a day: its followers follow
      const strip = frame(page, 'period/Followers').locator('fluvy-energy-period-card').first();
      await strip.locator('.ep-step[aria-label="Previous period"]').click();
      await page.waitForTimeout(800);
      const heads = await frame(page, 'period/Followers')
        .locator('.fv-card__sub')
        .evaluateAll((subs) => subs.map((sub) => sub.textContent.trim().split(' · ')[0]));
      check(
        '‹ on the Energy period strip turns its followers to "Yesterday"',
        heads.length >= 3 && heads.every((head) => head === 'Yesterday'),
        heads.join(', '),
      );
      // a stat tile's tap: its entity's details, said as a notice
      await frame(page, 'solar/Tiles · a tap on each tile')
        .locator('.fv-tile__tap')
        .first()
        .click();
      await page.waitForTimeout(200);
      check('a stat tile’s tap opens its details (a notice here)', (await toast(page)) === 1);
    }
    await page.close();
  }
}

/* ---------- the settings panel, every tab inside the demo, and the house's chart settings ---------- */
{
  const page = await open('panel=charts');
  const selected = () =>
    page.locator('fluvy-panel [role="tab"][aria-selected="true"]').getAttribute('id');
  check(
    'the panel opens on its Charts tab from the link',
    (await page.locator('fluvy-panel').count()) === 1 && (await selected()) === 'pn-tab-charts',
  );
  await page.locator('fluvy-panel #pn-tab-wall').click();
  await page.waitForTimeout(600);
  check(
    'its Wall tab opens inside the demo, the address following, no notice',
    (await selected()) === 'pn-tab-wall' &&
      page.url().includes('panel=wall') &&
      (await toast(page)) === 0,
    page.url(),
  );
  await page.locator('fluvy-panel #pn-tab-charts').click();
  await page.waitForTimeout(600);
  // the soft style, applied for the house: the address carries it, the cards draw it
  await page
    .locator('fluvy-panel .pn-tile')
    .filter({ has: page.locator('.pn-swatch__label', { hasText: /^Soft$/ }) })
    .click();
  await page.waitForTimeout(300);
  await page.locator('fluvy-panel .pn-bar .fv-btn--accent').last().click();
  await page.waitForTimeout(600);
  check(
    'a style saved in the Charts tab goes into the link',
    decodeURIComponent(page.url()).includes('charts={"style":"soft"}'),
    page.url(),
  );
  await fromMenu(page, 'sheet=charts&', 'Showcase');
  await page.waitForTimeout(700);
  const fromPanel = await chartOf(page, 'chart/Chart · history');
  await page.close();

  const classic = await open('sheet=charts');
  await classic.waitForTimeout(1000);
  const factory = await chartOf(classic, 'chart/Chart · history');
  await classic.close();
  const soft = await open(`sheet=charts&charts=${encodeURIComponent('{"style":"soft"}')}`);
  await soft.waitForTimeout(1000);
  const linked = await chartOf(soft, 'chart/Chart · history');
  check(
    'charts={"style":"soft"} draws a card that names no style soft, not classic',
    /fc-chart--soft/.test(linked) && linked !== factory,
  );
  check('…as the Charts tab’s Soft does', linked === fromPanel);
  await soft.close();
}
for (const tab of ['appearance', 'scope', 'dashboard', 'wall', 'preferences']) {
  const page = await open(`panel=${tab}`);
  check(
    `the panel opens on ${tab}`,
    (await page.locator('fluvy-panel [role="tab"][aria-selected="true"]').getAttribute('id')) ===
      `pn-tab-${tab}` && page.url().includes(`panel=${tab}`),
  );
  await page.close();
}

/* ---------- the gauges that move, the Web page, the Items card, the on/off bulb ---------- */
const running = (page) =>
  frame(page, 'animated/Moving · tiles').evaluate(async (el) => {
    el.scrollIntoView({ block: 'center' });
    await new Promise((resolve) => setTimeout(resolve, 600));
    return [...el.querySelectorAll('*')]
      .map((card) => card.shadowRoot?.querySelector('.fc-scene'))
      .filter(Boolean)
      .map(
        (scene) =>
          scene.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length,
      );
  });
{
  const page = await open('sheet=charts');
  const moving = await running(page);
  check(
    'the gauges that move run',
    moving.length >= 7 && moving.every((n) => n > 0),
    moving.join(' '),
  );
  await page.close();
  const still = await open('sheet=charts', DESKTOP, { reducedMotion: 'reduce' });
  const resting = await running(still);
  check(
    '…and rest when the visitor asks for less motion',
    resting.length >= 7 && resting.every((n) => n === 0),
    resting.join(' '),
  );
  await still.close();
}
{
  const page = await open('sheet=helpers');
  // a plate loads its page once it is on the screen
  await frame(page, 'web/Plate · 16:9').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);
  const plate = await frame(page, 'web/Plate · 16:9')
    .locator('fluvy-web-card')
    .evaluate((card) => {
      const iframe = card.shadowRoot.querySelector('iframe');
      return {
        src: iframe?.getAttribute('src') ?? '',
        on: iframe?.classList.contains('is-on') ?? false,
        skeleton: Boolean(card.shadowRoot.querySelector('.wb-skeleton')),
      };
    });
  check(
    'the Web page card loads its page from the demo’s own files',
    plate.on && !plate.skeleton && new URL(plate.src, DEMO).href.startsWith(`${DEMO}web/`),
    JSON.stringify(plate),
  );
  check(
    'the Items card lists the aircraft',
    (await frame(page, 'items/Items · flights').locator('.fv-row').count()) >= 3,
  );
  await page.close();
}
{
  const page = await open('sheet=devices');
  check(
    'an on/off bulb draws no ruler',
    (await frame(page, 'slider/On/off bulb').locator('fluvy-light-card').count()) >= 1 &&
      (await frame(page, 'slider/On/off bulb').locator('fluvy-ruler').count()) === 0,
  );
  await page.close();
}

/* ---------- each language its own words ---------- */
for (const [lang, word] of [
  ['pt-PT', 'A aquecer'],
  ['pt-BR', 'Aquecendo'],
  ['ja', '暖房中'],
]) {
  const page = await open(`sheet=climate&lang=${lang}`);
  check(
    `${lang}: the page speaks it, a heating thermostat says "${word}"`,
    (await page.locator('html').getAttribute('lang')) === lang &&
      (await words(page, 'climate/Heat')).includes(word),
  );
  await page.close();
}

{
  const page = await open('history=1');
  await page.waitForFunction(
    () => document.querySelector('fluvy-history')?.shadowRoot?.querySelector('.hs-main') !== null,
    null,
    { timeout: 20000 },
  );
  check('the History page mounts', true);
  await page.close();
}
check('no page errors, no failed requests', errors.length === 0, errors.slice(0, 6).join(' | '));

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exitCode = failed ? 1 : 0;
