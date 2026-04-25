const STYLE_ID = 'reading-flow-styles';
const LOCALE_HREF = 'reading-flow.ftl';

export class StyleManager {
  private doc: Document | null = null;

  public injectCSS(doc: Document) {
    this.doc = doc;
    if (doc.getElementById(STYLE_ID)) return;
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      tree-row[data-flow-color] {
        background-color: var(--reading-flow-row-color) !important;
      }
    `;
    (doc.head ?? doc.documentElement).appendChild(style);
  }

  public unregister() {
    this.doc?.getElementById(STYLE_ID)?.remove();
  }

  public injectLocale(win: Window, _rootURI: string) {
    const mozXULElement = (win as any).MozXULElement;
    const insertFTLIfNeeded = mozXULElement?.insertFTLIfNeeded;

    if (typeof insertFTLIfNeeded !== 'function') {
      return;
    }

    insertFTLIfNeeded.call(mozXULElement, LOCALE_HREF);
  }
}
