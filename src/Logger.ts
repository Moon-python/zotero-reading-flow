export class Logger {
  private static prefix = "[Reading Flow] ";

  static log(message: string, level: number = 3) {
    if (typeof Zotero !== "undefined" && Zotero.debug) {
      Zotero.debug(this.prefix + message, level);
    } else {
      console.log(this.prefix + message);
    }
  }

  static error(message: string, error?: any) {
    const errorMessage = error ? `${message}: ${error.message || error}` : message;
    if (typeof Zotero !== "undefined" && Zotero.debug) {
      Zotero.debug(this.prefix + "ERROR: " + errorMessage, 1);
    } else {
      console.error(this.prefix + "ERROR: " + errorMessage);
    }
    if (error && error.stack) {
      this.log("Stack trace: " + error.stack, 1);
    }
  }

  static warn(message: string) {
    this.log("WARN: " + message, 2);
  }
}
