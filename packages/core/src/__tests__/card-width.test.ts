// @vitest-environment happy-dom
import { html, type TemplateResult } from 'lit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FluvyCard } from '../card.js';
import type { HomeAssistant } from '../ha/types.js';

/**
 * Issue #104: a card is drawn to its own width from its first frame. It was drawn 360 wide (the width it starts at)
 * until its ResizeObserver first reported, so a card in a narrower column reached past a phone's edge meanwhile.
 * happy-dom lays nothing out and its observer never reports: the card's box is the width its style gives it.
 */
class WidthCard extends FluvyCard {
  /** The width of every frame drawn. */
  readonly drawn: number[] = [];
  protected renderCard(): TemplateResult {
    this.drawn.push(this.width);
    return html`<article></article>`;
  }
}
customElements.define('fluvy-card-width-test-card', WidthCard);

/** A card as Home Assistant makes one, in a box `width` wide (none: not laid out yet). */
async function mounted(width?: string): Promise<WidthCard> {
  const card = document.createElement('fluvy-card-width-test-card') as WidthCard;
  card.setConfig({ type: 'custom:fluvy-card-width-test-card' });
  card.hass = { states: {}, themes: { darkMode: false } } as unknown as HomeAssistant;
  if (width) card.style.width = width;
  document.body.append(card);
  await card.updateComplete;
  return card;
}

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

/** A ResizeObserver that reports a box when a test lays its card out (happy-dom's never reports). */
class Boxes {
  static made: Boxes[] = [];
  readonly watched: Element[] = [];
  constructor(readonly told: ResizeObserverCallback) {
    Boxes.made.push(this);
  }
  observe(target: Element): void {
    this.watched.push(target);
  }
  unobserve(): void {}
  disconnect(): void {}
  /** `card` laid out `width` wide (0: hidden), as its observer tells it. */
  static lay(card: Element, width: number): void {
    for (const one of Boxes.made.filter((made) => made.watched.includes(card)))
      one.told(
        [{ target: card, contentRect: { width } } as unknown as ResizeObserverEntry],
        one as unknown as ResizeObserver,
      );
  }
}

describe('a card’s width (#104)', () => {
  it('is its own box’s from its first frame: a half column’s card is never drawn 360 wide', async () => {
    const card = await mounted('156px');
    expect(card.drawn).toEqual([156]);
  });

  it('keeps the 360 it starts at while it has no box, until its observer reports', async () => {
    const card = await mounted();
    expect(card.drawn).toEqual([360]);
  });
});

/*
 * A card drawn while it had no box (in a folded section, a closed tab, a hidden frame) measured every text as nothing
 * wide: the Chart card's pills kept their longest words over its figure once it was shown at the width it kept.
 */
describe('a card drawn without a box', () => {
  it('draws again once it is laid out, at the width it kept too', async () => {
    vi.stubGlobal('ResizeObserver', Boxes);
    const card = await mounted();
    Boxes.lay(card, 360);
    await card.updateComplete;
    expect(card.drawn).toEqual([360, 360]);
    // laid out again at its width (taller, say): nothing to draw anew
    Boxes.lay(card, 360);
    await card.updateComplete;
    expect(card.drawn).toEqual([360, 360]);
  });

  it('hidden after it was drawn, and drawn meanwhile: draws again once it is shown', async () => {
    vi.stubGlobal('ResizeObserver', Boxes);
    const card = await mounted('320px');
    Boxes.lay(card, 320);
    Boxes.lay(card, 0);
    card.requestUpdate();
    await card.updateComplete;
    Boxes.lay(card, 320);
    await card.updateComplete;
    expect(card.drawn).toEqual([320, 320, 320]);
  });

  it('drawn with its box, draws once', async () => {
    vi.stubGlobal('ResizeObserver', Boxes);
    const card = await mounted('320px');
    Boxes.lay(card, 320);
    await card.updateComplete;
    expect(card.drawn).toEqual([320]);
  });
});
