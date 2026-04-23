import { BasicTool } from 'zotero-plugin-toolkit';

class Bootstrap {
  private tool: BasicTool;

  constructor() {
    this.tool = new BasicTool();
  }

  install() {}
  
  async startup({ id, version, rootURI }: { id: string; version: string; rootURI: string }) {
    Zotero.debug('Reading Flow: Starting up');
    // We will initialize managers here later
  }

  shutdown() {
    Zotero.debug('Reading Flow: Shutting down');
    // Critical: Clean up listeners here later
  }
  
  uninstall() {}
}

const BOOTSTRAP = new Bootstrap();
export { BOOTSTRAP as default };
