// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ensureEditorElements } from './rows-editor.js';

/*
 * Home Assistant's editors' own elements (`ha-form`, `ha-sortable`: the pickers, the drag of Customise's rows and of
 * the rooms' order) on a page that opened on Fluvy's settings panel, a reload on `/fluvy/dashboard/…`: the dashboards'
 * module, which puts Home Assistant's card helpers on the window, is asked for as its router asks for it.
 */

/** Home Assistant's app as far as its router: `home-assistant` › `home-assistant-main` › `partial-panel-resolver`. */
function app(routes: Record<string, unknown>): void {
  const root = document.createElement('home-assistant');
  const main = document.createElement('home-assistant-main');
  const resolver = Object.assign(document.createElement('partial-panel-resolver'), {
    routerOptions: { routes },
  });
  root.attachShadow({ mode: 'open' }).append(main);
  main.attachShadow({ mode: 'open' }).append(resolver);
  document.body.append(root);
}

/** The entities card as the card helpers make it: its editor defines what Home Assistant's editors use. */
class EntitiesCard extends HTMLElement {
  static async getConfigElement(): Promise<void> {
    if (!customElements.get('ha-sortable'))
      customElements.define('ha-sortable', class extends HTMLElement {});
  }
}
customElements.define('hui-entities-card', EntitiesCard);
// the pickers' form is there already: Fluvy waits for it, and the sorting is what the page lacks
customElements.define('ha-form', class extends HTMLElement {});

describe('Home Assistant’s editors’ elements on a page that opened on Fluvy’s panel', () => {
  // a step of Home Assistant's that is not there is no failure: nothing is said
  const said = vi.spyOn(console, 'warn');
  afterEach(() => document.body.replaceChildren());

  it('asks for nothing where Home Assistant’s router is not there, and waits as before', async () => {
    await ensureEditorElements();
    expect(customElements.get('ha-sortable')).toBeUndefined();
    expect(said).not.toHaveBeenCalled();
  });

  it('loads the dashboards’ module as the router does, and the sorting with the card helpers it brings', async () => {
    const loaded: string[] = [];
    app({
      config: { tag: 'ha-panel-config', load: () => Promise.resolve(loaded.push('config')) },
      home: {
        tag: 'ha-panel-lovelace',
        load: () => {
          loaded.push('lovelace');
          window.loadCardHelpers = () =>
            Promise.resolve({
              createCardElement: () => document.createElement('hui-entities-card'),
            });
          return Promise.resolve();
        },
      },
    });
    await ensureEditorElements();
    expect(loaded).toEqual(['lovelace']);
    expect(customElements.get('ha-sortable')).toBeDefined();
    expect(said).not.toHaveBeenCalled();
  });
});
