import { CSSResult, LitElement } from 'lit-element';
export declare class Base extends LitElement {
    static styles: CSSResult[] | undefined;
    static componentStyles: CSSResult[] | undefined;
    connectedCallback(): void;
    protected initialize(): void;
    protected adoptStyles(): void;
    /** @nocollapse */
    private _getUniqueStyles;
}
declare global {
    interface HTMLElementTagNameMap {
        'sp-base': Base;
    }
}
