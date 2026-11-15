import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import type { LanguageCode } from '@fluvy/core';
import { copyText } from '@fluvy/cards/clipboard';
import { baseStyles, glyph, reducedMotion } from '@fluvy/ui';
import { highlightYaml } from './highlight.js';
import { t } from './strings.js';

/** What the panel shows: the card's name over its layout (`variant: month`; none on the base), and the YAML. */
export interface YamlShown {
  readonly title: string;
  readonly layout?: string;
  readonly yaml: string;
}

/** A tap must clear the scrim's own opening tap; how long the panel takes to leave; how long Copy says it copied. */
const GUARD_MS = 350;
const LEAVE_MS = 200;
const COPIED_MS = 1600;

/**
 * "View YAML": the YAML that draws an example, as a code editor shows it — the mono face on the inset fill, its lines
 * numbered, keys, strings, numbers, booleans and null, a list's dashes and comments each in a tone of the page's look —
 * with a Copy that copies the exact text and says so for a moment, and a line on the entities being the demo house's.
 * A side sheet on a wide screen, the language's bottom sheet on a phone, in a modal dialog: Escape, the scrim and
 * Close close it, the focus stays inside while it is open and goes back where it came from.
 */
export class FluvyDemoYaml extends LitElement {
  static override styles = [
    ...baseStyles,
    css`
      :host {
        display: contents;
        font-family: Inter, system-ui, sans-serif;
      }
      dialog {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        max-width: none;
        max-height: none;
        margin: 0;
        padding: 0;
        border: 0;
        overflow: hidden;
        background: color-mix(in srgb, var(--fluvy-neutral-05, #000) 40%, transparent);
        color: var(--fluvy-text);
        overscroll-behavior: contain;
        animation: fv-fade 240ms var(--fv-ease, ease) both;
      }
      dialog::backdrop {
        background: none;
      }
      dialog.is-leaving {
        animation: ym-fade-out ${LEAVE_MS}ms var(--fv-ease, ease) both;
      }
      @keyframes ym-fade-out {
        to {
          opacity: 0;
        }
      }

      /* a wide screen: a sheet at the window's side, 16 from its edges, every corner round, as tall as its YAML (the
         YAML scrolls under its head where the window is shorter) */
      .ym-sheet {
        position: absolute;
        top: 16px;
        right: 16px;
        max-height: calc(100% - 32px);
        display: flex;
        flex-direction: column;
        width: min(520px, calc(100% - 32px));
        box-sizing: border-box;
        padding: 0;
        border-radius: var(--fluvy-radius-xl);
        box-shadow:
          0 0 0 1px var(--fluvy-edge, var(--fluvy-border)),
          0 24px 64px -24px rgb(0 0 0 / calc(0.4 * var(--fluvy-shade, 1)));
        animation: ym-side-in 280ms var(--fv-ease-out, ease-out) both;
      }
      dialog.is-leaving .ym-sheet {
        animation: ym-side-out ${LEAVE_MS}ms var(--fv-ease, ease) both;
      }
      @keyframes ym-side-in {
        from {
          opacity: 0;
          transform: translateX(24px);
        }
      }
      @keyframes ym-side-out {
        to {
          opacity: 0;
          transform: translateX(24px);
        }
      }
      .fv-sheet__grabber {
        display: none;
      }
      .ym-head {
        flex: 0 0 auto;
        height: auto;
        padding: 16px 16px 12px 20px;
      }
      .ym-titles {
        flex: 1 1 auto;
        min-width: 0;
      }
      .ym-titles h2 {
        margin: 0;
      }
      .ym-sub {
        margin: 2px 0 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 20px;
        color: var(--fluvy-text-secondary);
        overflow-wrap: anywhere;
      }
      .ym-sub code {
        font-family: var(--fluvy-font-mono);
      }
      .ym-body {
        flex: 1 1 auto;
        min-height: 0;
        padding: 0 16px;
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      .ym-code {
        margin: 0;
        padding: 12px 16px 12px 12px;
        border-radius: var(--fluvy-radius-control);
        background: var(--fluvy-inset, var(--fluvy-page));
        box-shadow: inset 0 0 0 1px var(--fluvy-border);
        font-family: var(--fluvy-font-mono);
        font-size: 13px;
        line-height: 20px;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        tab-size: 2;
        color: var(--fluvy-text);
      }
      .ym-code:focus-visible {
        outline: none;
        box-shadow: inset 0 0 0 2px var(--fluvy-accent);
      }
      /* a line: its number in the gutter (not text: never selected, copied or read), the line beside it; a line too
         long for the sheet wraps under its own words, its number on its first row */
      .ym-row {
        display: grid;
        grid-template-columns: var(--ym-gutter) minmax(0, 1fr);
        column-gap: 16px;
      }
      .ym-row::before {
        content: attr(data-line);
        text-align: right;
        color: var(--fluvy-text-disabled);
        user-select: none;
        -webkit-user-select: none;
      }
      .ym-text {
        padding-left: calc(var(--ym-indent) * 1ch);
        text-indent: calc(var(--ym-indent) * -1ch);
      }
      .yl-key {
        color: var(--fluvy-accent-text, var(--fluvy-accent));
      }
      .yl-string {
        color: var(--fluvy-text);
      }
      .yl-number {
        color: var(--fluvy-info);
      }
      .yl-bool,
      .yl-null {
        color: var(--fluvy-warning);
      }
      .yl-dash {
        color: var(--fluvy-text-secondary);
        font-weight: 700;
      }
      .yl-punct {
        color: var(--fluvy-text-secondary);
      }
      .yl-comment {
        color: var(--fluvy-text-secondary);
        font-style: italic;
      }
      .ym-foot {
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
      }
      .ym-copy {
        gap: 8px;
        width: 100%;
      }
      .ym-copy svg {
        width: 20px;
        height: 20px;
      }
      .ym-note {
        margin: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 18px;
        text-align: center;
        color: var(--fluvy-text-secondary);
      }

      /* a phone: the language's bottom sheet, its grabber, the whole width, under the status bar's room */
      @media (max-width: 719px) {
        dialog .ym-sheet {
          top: auto;
          right: 0;
          bottom: 0;
          left: 0;
          width: 100%;
          max-height: calc(
            100% - max(24px, var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))
          );
          border-radius: var(--fluvy-radius-xl) var(--fluvy-radius-xl) 0 0;
          animation: ym-up 320ms var(--fv-ease-out, ease-out) both;
        }
        dialog.is-leaving .ym-sheet {
          animation: ym-down ${LEAVE_MS}ms var(--fv-ease, ease) both;
        }
        .fv-sheet__grabber {
          display: block;
          flex: 0 0 auto;
        }
        .ym-head {
          padding: 0 16px 12px;
        }
        .ym-foot {
          padding-bottom: max(
            16px,
            var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))
          );
        }
      }
      @keyframes ym-up {
        from {
          transform: translateY(100%);
        }
      }
      @keyframes ym-down {
        to {
          transform: translateY(100%);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        dialog,
        dialog .ym-sheet {
          animation: none !important;
        }
      }
    `,
  ];

  static override properties = {
    language: { attribute: false },
    shown: { state: true },
    leaving: { state: true },
    copied: { state: true },
  };

  declare language: LanguageCode;
  declare shown: YamlShown | undefined;
  declare leaving: boolean;
  /** Copy says it copied, for a moment. */
  declare copied: boolean;
  private opener: HTMLElement | undefined;
  private openedAt = 0;
  private leaveTimer = 0;
  private copiedTimer = 0;

  constructor() {
    super();
    this.language = 'en';
    this.shown = undefined;
    this.leaving = false;
    this.copied = false;
  }

  /** Shows `shown`; `opener` gets the focus back when the panel closes. */
  open(shown: YamlShown, opener?: HTMLElement): void {
    clearTimeout(this.leaveTimer);
    this.opener = opener;
    this.openedAt = performance.now();
    this.leaving = false;
    this.copied = false;
    this.shown = shown;
  }

  /** Leaves, gliding out; safe to call at any time. */
  close(): void {
    if (!this.shown || this.leaving) return;
    if (reducedMotion()) {
      this.finish();
      return;
    }
    this.leaving = true;
    this.leaveTimer = window.setTimeout(() => this.finish(), LEAVE_MS);
  }

  private finish(): void {
    clearTimeout(this.leaveTimer);
    const dialog = this.renderRoot.querySelector('dialog');
    if (dialog?.open) dialog.close();
    this.leaving = false;
    this.shown = undefined;
    const opener = this.opener;
    this.opener = undefined;
    if (opener?.isConnected) opener.focus();
  }

  protected override updated(): void {
    const dialog = this.renderRoot.querySelector('dialog');
    if (dialog && this.shown && !dialog.open) {
      dialog.showModal();
      this.renderRoot.querySelector<HTMLElement>('.ym-close')?.focus();
    }
  }

  /** Copies the YAML; where the browser refuses, the code is selected for the person's own copy. */
  private async copy(): Promise<void> {
    if (!this.shown) return;
    if (!(await copyText(this.shown.yaml))) {
      const code = this.renderRoot.querySelector('.ym-code');
      if (code) getSelection()?.selectAllChildren(code);
      return;
    }
    this.copied = true;
    clearTimeout(this.copiedTimer);
    this.copiedTimer = window.setTimeout(() => (this.copied = false), COPIED_MS);
  }

  private onClick(event: MouseEvent): void {
    // only the scrim closes, and not the tap that opened the panel
    if (event.target !== event.currentTarget) return;
    if (performance.now() - this.openedAt >= GUARD_MS) this.close();
  }

  private renderCode(yaml: string): TemplateResult {
    const lines = highlightYaml(yaml);
    const gutter = String(lines.length).length;
    return html`<pre class="ym-code" tabindex="0" aria-label="YAML" style="--ym-gutter:${gutter}ch">
${lines.map((pieces, index) => {
        // a wrapped line goes on under its own words, two in from where the line starts
        const indent = (pieces[0]?.kind === 'space' ? pieces[0].text.length : 0) + 2;
        return html`<span class="ym-row" data-line=${index + 1}
          ><span class="ym-text" style="--ym-indent:${indent}"
            >${pieces.map((piece) =>
              piece.kind === 'space'
                ? piece.text
                : html`<span class="yl-${piece.kind}">${piece.text}</span>`,
            )}${index < lines.length - 1 ? '\n' : ''}</span
          ></span
        >`;
      })}</pre>`;
  }

  override render(): TemplateResult | typeof nothing {
    const shown = this.shown;
    if (!shown) return nothing;
    const lang = this.language;
    const copied = this.copied;
    return html`<dialog
      class=${this.leaving ? 'is-leaving' : ''}
      aria-labelledby="ym-title"
      aria-describedby="ym-note"
      @cancel=${(event: Event) => {
        event.preventDefault();
        this.close();
      }}
      @close=${() => {
        if (this.shown && !this.leaving) this.finish();
      }}
      @click=${this.onClick}
    >
      <div class="fv-sheet ym-sheet">
        <div class="fv-sheet__grabber"><span></span></div>
        <div class="fv-sheet__head ym-head">
          <div class="ym-titles">
            <h2 class="fv-sheet__title" id="ym-title">${shown.title}</h2>
            <p class="ym-sub">
              ${shown.layout ? html`<code>${shown.layout}</code>` : t(lang, 'card.default')}
            </p>
          </div>
          <button
            class="fv-round fv-round--quiet ym-close"
            data-target
            aria-label=${t(lang, 'yaml.close')}
            title=${t(lang, 'yaml.close')}
            @click=${() => this.close()}
          >
            ${glyph('close')}
          </button>
        </div>
        <div class="ym-body">${this.renderCode(shown.yaml)}</div>
        <div class="ym-foot">
          <button
            class="fv-btn fv-btn--accent ym-copy"
            data-target
            aria-live="polite"
            @click=${() => void this.copy()}
          >
            ${glyph(copied ? 'check' : 'copy')}${t(lang, copied ? 'yaml.copied' : 'yaml.copy')}
          </button>
          <p class="ym-note" id="ym-note">${t(lang, 'yaml.note')}</p>
        </div>
      </div>
    </dialog>`;
  }
}

if (!customElements.get('fluvy-demo-yaml')) customElements.define('fluvy-demo-yaml', FluvyDemoYaml);

declare global {
  interface HTMLElementTagNameMap {
    'fluvy-demo-yaml': FluvyDemoYaml;
  }
}
