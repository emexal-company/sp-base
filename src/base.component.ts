import { CSSResultArray, CSSResult,  customElement, LitElement} from 'lit-element';
import { supportsAdoptingStyleSheets } from 'lit-element/lib/css-tag.js';

import { Spectrum } from '@spectrum/sp-config';

function arrayFlat(
    styles: CSSResultArray, result: CSSResult[] = []): CSSResult[] {
    for (let i = 0, length = styles.length; i < length; i++) {
        const value = styles[i];
        if (Array.isArray(value)) {
            arrayFlat(value, result);
        } else {
            result.push(value as CSSResult);
        }
    }
    return result;
}

/** Deeply flattens styles array. Uses native flat if available. */
const flattenStyles = (styles: CSSResultArray): CSSResult[] =>
    styles.flat ? styles.flat(Infinity) : arrayFlat(styles);

@customElement('sp-base')
export class Base extends LitElement {
    public static styles: CSSResult[] | undefined;
    public static componentStyles: CSSResult[] | undefined;

    public connectedCallback() {
        super.connectedCallback();

        document.addEventListener('spectrum-theme-changed', (_) => {
            // Rebuild the static style, before adopting the new styles
            Object.getPrototypeOf(this).constructor.styles = this._getUniqueStyles();
            this.adoptStyles();
            this.requestUpdate();
        });
    }

    protected initialize() {
        if (!Object.getPrototypeOf(this).constructor.styles) {
            Object.getPrototypeOf(this).constructor.styles = this._getUniqueStyles();
        }
        return super.initialize();
    }

    protected adoptStyles() {
        const styles = Object.getPrototypeOf(this).constructor.styles;
        if (styles.length === 0) {
            return;
        }
        // There are three separate cases here based on Shadow DOM support.
        // (1) shadowRoot polyfilled: use ShadyCSS
        // (2) shadowRoot.adoptedStyleSheets available: use it.
        // (3) shadowRoot.adoptedStyleSheets polyfilled: append styles after
        // rendering
        if ((window as any).ShadyCSS !== undefined && !(window as any).ShadyCSS.nativeShadow) {
            (window as any).ShadyCSS.ScopingShim!.prepareAdoptedCssText(
                styles.map((s: any) => s.cssText), this.localName);
        } else if (supportsAdoptingStyleSheets) {
            (this.renderRoot as any).adoptedStyleSheets =
                styles.map((s: any) => s.styleSheet!);
        } else {
            // This must be done after rendering so the actual style insertion is done
            // in `update`.
            Object.getPrototypeOf(this)._needsShimAdoptedStyleSheets = true;
        }
    }

    /** @nocollapse */
    private _getUniqueStyles(): CSSResult[] {
        // Take care not to call `this.styles` multiple times since this generates
        // new CSSResults each time.
        // TODO(sorvell): Since we do not cache CSSResults by input, any
        // shared styles will generate new stylesheet objects, which is wasteful.
        // This should be addressed when a browser ships constructable
        // stylesheets.
        const userStyles = [Spectrum.themeStyles, Object.getPrototypeOf(this).constructor.componentStyles];
        const styles: CSSResult[] = [];
        if (Array.isArray(userStyles)) {
            const flatStyles = flattenStyles(userStyles);
            // As a performance optimization to avoid duplicated styling that can
            // occur especially when composing via subclassing, de-duplicate styles
            // preserving the last item in the list. The last item is kept to
            // try to preserve cascade order with the assumption that it's most
            // important that last added styles override previous styles.
            const styleSet = flatStyles.reduceRight((set, s) => {
                set.add(s);
                // on IE set.add does not return the set.
                return set;
            }, new Set<CSSResult>());
            // Array.from does not work on Set in IE
            styleSet.forEach((v) => styles.unshift(v));
        } else if (userStyles) {
            styles.push(userStyles);
        }
        return styles;
    }



}

declare global {
    interface HTMLElementTagNameMap {
        'sp-base': Base;
    }
}
