#!/usr/bin/env node
/**
 * Interaction tests for the Swipe card (#206) on the playground's `swipe` sheet. On a touch screen (the browser's own
 * touches, `Input.dispatchTouchEvent`: its scroll takes them as a phone's would): a swipe turns one page and the row
 * comes to rest on it, its mark lit and the page said; only the pages in view and the next one on each side hold their
 * cards; the first page goes no further back; `loop` goes round both ways and stays laid out round the page it is on;
 * a drag along a ruler sets the lamp and turns nothing, a drag along a row of chips scrolls the row and turns nothing;
 * the card stands as tall as it declares. With a mouse: a mark turns to its page (gliding to the next, fading further
 * on, at once with reduced motion), the keys turn it (the arrows, Home and End on the marks, an arrow from a page) and
 * the focus goes with it, a trackpad's sideways wheel turns it, the counter takes the marks' place where they would
 * not fit, a card that hides itself is no page and has no mark, it opens on `start`, it turns by itself where asked
 * (`autoplay`) and waits under the pointer, a person's page is kept in the
 * tab (and only where asked), the config is never written, and side by side on a desktop it turns a card at a time.
 * Exit code 1 on any failure.
 *   PLAYGROUND=http://127.0.0.1:5307/ node interactions-swipe.mjs
 */
import { BASE, calls, frame, reset, settle, startSuite } from './lib/suite.mjs';

const suite = await startSuite();
const { check } = suite;

/** What a snapped row needs to come to rest, and a fade's two legs, with room. */
const REST = 900;

/** The `n`th swipe card of a frame. */
const card = (page, title, n = 0) => frame(page, title).locator(':scope > fluvy-swipe-card').nth(n);

/** Where a swipe card stands: its page, its lit mark or counter, its cards in the page, its row, what it said. */
const seen = (locator) =>
  locator.evaluate((el) => {
    const root = el.shadowRoot;
    const track = root.querySelector('.sw-track');
    const marks = [...root.querySelectorAll('.sw-mark')];
    const pages = [...root.querySelectorAll('.sw-page')];
    return {
      at: el.at_,
      marks: marks.length,
      lit: marks.findIndex((mark) => mark.classList.contains('is-on')),
      current: marks.findIndex((mark) => mark.getAttribute('aria-current') === 'true'),
      count: root.querySelector('.sw-count')?.textContent.trim() ?? null,
      held: [...el.children].map((child) => Number(child.slot.slice(1))).sort((a, b) => a - b),
      left: Math.round(track?.scrollLeft ?? 0),
      // the page whose start the row stands at
      shown: pages.findIndex(
        (box) =>
          !box.hidden &&
          Math.abs(box.getBoundingClientRect().left - track.getBoundingClientRect().left) < 2,
      ),
      inert: pages.map((box) => box.inert),
      hidden: pages.map((box) => box.hidden),
      labels: pages.map((box) => box.getAttribute('aria-label')),
      said: root.querySelector('.fv-sr')?.textContent ?? '',
      height: Math.round(el.getBoundingClientRect().height),
      declared: el.constructor.layoutHeight(el.config),
      focused: root.activeElement?.className ?? null,
    };
  });

/** The calls the cards made and the configs written (a gesture never writes one), since the last look. */
const watchConfigs = (page) =>
  page.evaluate(() => {
    window.__configs = [];
    window.addEventListener('config-changed', (event) => window.__configs.push(event.detail), true);
  });
const configs = (page) => page.evaluate(() => window.__configs.length);

/* ---------- a finger ---------- */
{
  const context = await suite.browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(`${BASE}?sheet=swipe&width=360`);
  await page.waitForSelector('html[data-ready="1"]');
  await settle(page, 1200);
  await watchConfigs(page);
  const cdp = await context.newCDPSession(page);
  const touch = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  /** A finger from `from` to `to` in `steps` moves a frame apart, then lifted. */
  const drag = async (from, to, steps = 12) => {
    await touch('touchStart', [from]);
    for (let i = 1; i <= steps; i++) {
      await touch('touchMove', [
        { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps },
      ]);
      await page.waitForTimeout(16);
    }
    await touch('touchEnd', []);
    await settle(page, REST);
  };
  /** A swipe across a card's middle band: `on` (to the left, the next page) or back. */
  const swipe = async (locator, way, y = 0.4) => {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    const at = box.y + Math.min(box.height * y, 200);
    const [from, to] = way === 'on' ? [0.8, 0.15] : [0.2, 0.85];
    await drag({ x: box.x + box.width * from, y: at }, { x: box.x + box.width * to, y: at });
  };

  const rooms = card(page, 'Rooms');
  let now = await seen(rooms);
  check(
    'it opens on its first page, its first mark lit, and holds only that page’s card and the next',
    now.at === 0 &&
      now.marks === 3 &&
      now.lit === 0 &&
      now.current === 0 &&
      now.shown === 0 &&
      now.held.join() === '0,1' &&
      now.inert.join() === 'false,true,true',
    JSON.stringify(now),
  );
  check(
    'each page is a group a reader hears by its place',
    now.labels.join() === 'Page 1 of 3,Page 2 of 3,Page 3 of 3',
    now.labels.join(' · '),
  );
  const height = now.height;
  check('it stands as tall as it declares', Math.abs(height - now.declared) <= 1, `${height}`);

  await swipe(rooms, 'on');
  now = await seen(rooms);
  check(
    'a swipe turns one page: the next comes to rest in view, its mark lit, said, and the one after it is built',
    now.at === 1 &&
      now.lit === 1 &&
      now.shown === 1 &&
      now.said === 'Page 2 of 3' &&
      now.held.join() === '0,1,2' &&
      now.inert.join() === 'true,false,true',
    JSON.stringify(now),
  );
  await swipe(rooms, 'on');
  now = await seen(rooms);
  check(
    'a page two away leaves the page; the row keeps its height',
    now.at === 2 && now.held.join() === '1,2' && now.height === height,
    JSON.stringify(now),
  );
  await swipe(rooms, 'on');
  check('past the last page it stays', (await seen(rooms)).at === 2);
  await swipe(rooms, 'back');
  await swipe(rooms, 'back');
  await swipe(rooms, 'back');
  now = await seen(rooms);
  check(
    'back to the first, and no further',
    now.at === 0 && now.shown === 0 && now.said === 'Page 1 of 3',
    JSON.stringify(now),
  );

  // round: back from the first is the last, on from the last is the first, the row laid out round the page it is on
  const round = card(page, 'Cameras · round');
  const left = (await seen(round)).left;
  await swipe(round, 'back');
  now = await seen(round);
  check(
    'round: back from the first page is the last',
    now.at === 3 && now.lit === 3 && now.shown === 3 && now.held.join() === '0,2,3',
    JSON.stringify(now),
  );
  await swipe(round, 'on');
  await swipe(round, 'on');
  now = await seen(round);
  check(
    'round: on from the last page is the first, and on again the second',
    now.at === 1 && now.shown === 1 && now.left === left,
    JSON.stringify(now),
  );
  check(
    'round: the row stands where it stood each time, laid out round the page it is on',
    now.left === left && left > 0,
    `${left} → ${now.left}`,
  );

  // a drag along a ruler sets the lamp, never turns the page
  const lamps = card(page, 'Lamps · the ruler keeps its drag');
  await lamps.scrollIntoViewIfNeeded();
  const ruler = await lamps.locator('fluvy-light-card fluvy-ruler .fv-ruler').first().boundingBox();
  await reset(page);
  await drag(
    { x: ruler.x + ruler.width * 0.62, y: ruler.y + ruler.height / 2 },
    { x: ruler.x + ruler.width * 0.2, y: ruler.y + ruler.height / 2 },
    14,
  );
  let called = await calls(page);
  now = await seen(lamps);
  check(
    'a drag along a ruler sets the lamp and turns no page',
    called.length === 1 && called[0].s === 'light.turn_on' && now.at === 0 && now.shown === 0,
    `${JSON.stringify(called.map((c) => [c.s, c.d]))} · page ${now.at}`,
  );
  // a swipe off the ruler, on the lamp's head, turns it
  await swipe(lamps, 'on', 0.1);
  check('a swipe on the lamp’s head turns the page', (await seen(lamps)).at === 1);

  // a drag along a row of chips scrolls the row, never turns the page
  const chips = card(page, 'Chips · the row keeps its drag');
  await chips.scrollIntoViewIfNeeded();
  const row = chips.locator('fluvy-chips-card .fv-chips').first();
  const box = await row.boundingBox();
  const scrolled = () => row.evaluate((el) => Math.round(el.scrollLeft));
  const before = await scrolled();
  await drag(
    { x: box.x + box.width * 0.8, y: box.y + box.height / 2 },
    { x: box.x + box.width * 0.2, y: box.y + box.height / 2 },
  );
  const after = await scrolled();
  now = await seen(chips);
  check(
    'a drag along a row of chips scrolls the row and turns no page',
    after > before && now.at === 0 && now.shown === 0,
    `${before} → ${after} · page ${now.at}`,
  );
  // at the row's end, the same drag is still the row's
  await drag(
    { x: box.x + box.width * 0.8, y: box.y + box.height / 2 },
    { x: box.x + box.width * 0.1, y: box.y + box.height / 2 },
  );
  check('and so it is at the row’s end', (await seen(chips)).at === 0);

  check('no swipe wrote a config', (await configs(page)) === 0);
  await context.close();
}

/* ---------- a mouse, the keys, a trackpad ---------- */
{
  const page = await suite.sheet('swipe');
  await watchConfigs(page);
  const rooms = card(page, 'Rooms');
  await rooms.scrollIntoViewIfNeeded();
  const mark = (locator, n) => locator.locator('.sw-mark').nth(n);

  // the next page glides in; further on, the row fades out and in where it stands
  await mark(rooms, 1).click();
  await settle(page, REST);
  let now = await seen(rooms);
  check(
    'a mark turns to its page',
    now.at === 1 && now.shown === 1 && now.lit === 1,
    JSON.stringify(now),
  );
  await mark(rooms, 0).click();
  await settle(page, REST);
  await mark(rooms, 2).click();
  await page.waitForTimeout(60);
  const fading = await rooms.evaluate((el) =>
    Number(getComputedStyle(el.shadowRoot.querySelector('.sw-track')).opacity),
  );
  await settle(page, REST);
  now = await seen(rooms);
  check(
    'a mark two pages on fades the row out and stands it there, its cards built, the first gone',
    fading < 1 && now.at === 2 && now.shown === 2 && now.held.join() === '1,2',
    `opacity ${fading} · ${JSON.stringify(now)}`,
  );

  // the keys on the marks: an arrow, End, Home, the focus going with the lit mark
  await mark(rooms, 2).focus();
  await page.keyboard.press('ArrowLeft');
  await settle(page, REST);
  now = await seen(rooms);
  check(
    'an arrow on the marks turns a page, the focus on its mark',
    now.at === 1 && now.focused?.includes('is-on'),
    JSON.stringify(now),
  );
  await page.keyboard.press('Home');
  await settle(page, REST);
  check('Home turns to the first page', (await seen(rooms)).at === 0);
  await page.keyboard.press('End');
  await settle(page, REST);
  check('End turns to the last page', (await seen(rooms)).at === 2);
  check(
    'only the lit mark is a stop of the Tab key',
    (await rooms.evaluate((el) =>
      [...el.shadowRoot.querySelectorAll('.sw-mark')].map((m) => m.tabIndex).join(),
    )) === '-1,-1,0',
  );

  // an arrow on a ruler is the ruler's; from a page whose control keeps none of them it turns the page, and the focus
  // goes with the page
  const lamps = card(page, 'Lamps · the ruler keeps its drag');
  await lamps.scrollIntoViewIfNeeded();
  await reset(page);
  await lamps.locator('[slot="p0"] fluvy-ruler .fv-ruler').focus();
  await page.keyboard.press('ArrowRight');
  await settle(page, REST);
  now = await seen(lamps);
  const called = await calls(page);
  check(
    'an arrow on a ruler is the ruler’s',
    now.at === 0 && called.some((c) => c.s === 'light.turn_on'),
    `${JSON.stringify(called.map((c) => c.s))} · page ${now.at}`,
  );
  await lamps.locator('[slot="p0"] fluvy-light-card button').first().focus();
  await page.keyboard.press('ArrowRight');
  await settle(page, REST);
  now = await seen(lamps);
  check(
    'an arrow from a page turns it, the focus on the page it came to',
    now.at === 1 && now.shown === 1 && now.focused?.includes('sw-page'),
    JSON.stringify(now),
  );

  // a trackpad's sideways wheel turns it a page
  const energy = card(page, 'Energy');
  await energy.scrollIntoViewIfNeeded();
  const box = await energy.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 120);
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(40, 0);
    await page.waitForTimeout(16);
  }
  await settle(page, REST * 1.5);
  now = await seen(energy);
  check(
    'a trackpad’s sideways wheel turns a page',
    now.at === 1 && now.shown === 1,
    JSON.stringify(now),
  );

  // more pages than half a section has marks for: the counter between its turns
  const half = card(page, 'Half pairs · the counter on one card');
  await half.scrollIntoViewIfNeeded();
  now = await seen(half);
  const back = half.locator('.sw-turn').nth(0);
  const on = half.locator('.sw-turn').nth(1);
  check(
    'half a section with six pages: the counter, its turn back still at the first',
    now.marks === 0 && now.count === '1 / 6' && (await back.isDisabled()),
    JSON.stringify(now),
  );
  await on.click();
  await settle(page, REST);
  check('its turn on turns a page', (await seen(half)).count === '2 / 6');
  const roundHalf = card(page, 'Half pairs · the counter', 1);
  await roundHalf.scrollIntoViewIfNeeded();
  check(
    'round, it opens on its start and its turn back is there at the first',
    (await seen(roundHalf)).count === '3 / 6' &&
      !(await roundHalf.locator('.sw-turn').nth(0).isDisabled()),
  );
  check(
    'three pages in half a section: three marks',
    (await seen(card(page, 'Half pairs · the counter on one card', 1))).marks === 3,
  );

  // a card that hides itself is no page and has no mark
  now = await seen(card(page, 'A page that is no page'));
  check(
    'a card hidden by its conditions is no page: three marks for four cards',
    now.marks === 3 && now.hidden.join() === 'false,false,true,false',
    JSON.stringify(now),
  );

  // it opens on `start`
  now = await seen(card(page, 'Starts on the garden'));
  check(
    'it opens on its start',
    now.at === 1 && now.shown === 1 && now.lit === 1,
    JSON.stringify(now),
  );

  // side by side on a desktop: two in view, a card further each time
  const wide = await suite.sheet('swipe', { width: 1400 });
  const two = card(wide, 'Cameras · two side by side · 1400');
  await two.scrollIntoViewIfNeeded();
  now = await seen(two);
  check(
    'two side by side: both in view, the next and the last built, four stops round',
    now.marks === 4 &&
      now.inert.join() === 'false,false,true,true' &&
      now.held.join() === '0,1,2,3',
    JSON.stringify(now),
  );
  await mark(two, 1).click();
  await settle(wide, REST);
  now = await seen(two);
  check(
    'a stop on, one card further',
    now.at === 1 && now.inert.join() === 'true,false,false,true',
    JSON.stringify(now),
  );
  await wide.close();

  // by itself: a page every four seconds, held while the pointer is over it
  const clock = card(page, 'Cameras · by themselves');
  await clock.scrollIntoViewIfNeeded();
  await page.mouse.move(5, 5);
  const from = (await seen(clock)).at;
  await settle(page, 4800);
  now = await seen(clock);
  check(
    'by itself it turns a page when its seconds are up, and says nothing of it',
    now.at === (from + 1) % 4 && now.said === '',
    `${from} → ${JSON.stringify(now)}`,
  );
  const over = await clock.boundingBox();
  await page.mouse.move(over.x + over.width / 2, over.y + 60);
  const held = (await seen(clock)).at;
  await settle(page, 5000);
  check('the pointer over it holds it', (await seen(clock)).at === held);
  await page.mouse.move(5, 5);

  // kept in the tab where asked, and only there
  const kept = card(page, 'Remembers');
  await mark(kept, 1).click();
  await mark(rooms, 1).click();
  await settle(page, REST);
  await page.reload();
  await page.waitForSelector('html[data-ready="1"]');
  await settle(page, 1200);
  check(
    'a person’s page is kept in the tab, and the config never written',
    (await seen(card(page, 'Remembers'))).at === 1 && (await seen(card(page, 'Rooms'))).at === 0,
  );
  check('no mark wrote a config', (await page.evaluate(() => window.__configs?.length ?? 0)) === 0);
  await page.close();
}

/* ---------- reduced motion ---------- */
{
  const page = await suite.page('sheet=swipe&width=360', { reducedMotion: 'reduce' });
  const rooms = card(page, 'Rooms');
  await rooms.scrollIntoViewIfNeeded();
  await rooms.locator('.sw-mark').nth(1).click();
  await page.waitForTimeout(80);
  const now = await seen(rooms);
  check('with reduced motion, a mark turns the page at once', now.shown === 1, JSON.stringify(now));
  await page.close();
}

await suite.finish();
