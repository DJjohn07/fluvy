/*
 * A finger's sideways drag that sets off on what takes such a drag for itself is that thing's, never the Swipe card's
 * (the rule the house's swipe between views kept, 1.2.0): a ruler, a dial or a slider, Home Assistant's map, a row that
 * scrolls sideways, a field, anything marked `data-swipe="off"`. What says so with its `touch-action` (our rulers and
 * dials: `pan-y` or `none`) the browser already keeps from the card's scroll; the rest the card holds still while it
 * is pressed (`swipe-card.ts`).
 */

/** What takes a sideways drag whatever its `touch-action`: a field, Home Assistant's sliders and map, a mark of ours. */
const OWN =
  'input, textarea, select, ha-slider, ha-control-slider, ha-control-circular-slider, ha-map, hui-map-card, [data-swipe="off"]';

/**
 * Whether a press is theirs: something on its path (its composed path, the element pressed first) takes a sideways
 * drag — by its kind, by a `touch-action` that pans no way sideways (`none`, `pan-y`, `pinch-zoom`), or by scrolling
 * sideways itself, a row with more than it shows. Looked for up to `stop`, the card's page.
 */
export function theirs(path: readonly EventTarget[], stop: Element): boolean {
  for (const target of path) {
    if (target === stop) return false;
    if (!(target instanceof Element)) continue;
    if (target.matches(OWN)) return true;
    const style = getComputedStyle(target);
    const touch = style.touchAction || 'auto';
    if (touch !== 'auto' && touch !== 'manipulation' && !touch.includes('pan-x')) return true;
    if (
      (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
      target.scrollWidth > target.clientWidth + 1
    )
      return true;
  }
  return false;
}
