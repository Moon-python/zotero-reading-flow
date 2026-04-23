import { UITool } from 'zotero-plugin-toolkit';

export class StyleManager {
  private uiTool: UITool;

  constructor() {
    this.uiTool = new UITool();
  }

  public injectCSS() {
    this.uiTool.registerCSS(`
      tree-row[data-flow-color] {
        background-color: var(--reading-flow-row-color) !important;
      }
    `);
  }

  public unregister() {
    this.uiTool.unregisterAll(); 
  }
}
