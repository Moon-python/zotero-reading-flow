import { BasicTool } from 'zotero-plugin-toolkit';
import { DataStore } from './dataStore';
import { Logger } from './Logger';

class Bootstrap {
  private tool: BasicTool;
  public dataStore?: DataStore;

  constructor() {
    this.tool = new BasicTool();
  }

  install() {}
  
  async startup({ id, version, rootURI }: { id: string; version: string; rootURI: string }) {
    Logger.log('Reading Flow: Starting up');
    this.dataStore = new DataStore();
    // We will initialize managers here later
  }

  shutdown() {
    Logger.log('Reading Flow: Shutting down');
    // Critical: Clean up listeners here later
  }
  
  uninstall() {}
}

const BOOTSTRAP = new Bootstrap();
export { BOOTSTRAP as default };
