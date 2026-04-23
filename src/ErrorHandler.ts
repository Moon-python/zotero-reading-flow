import { Logger } from "./Logger";

export class ErrorHandler {
  static wrap<T extends (...args: any[]) => any>(
    fn: T,
    context: string
  ): (...args: Parameters<T>) => ReturnType<T> | undefined {
    return (...args: Parameters<T>) => {
      try {
        return fn(...args);
      } catch (error) {
        Logger.error(`Error in ${context}`, error);
        return undefined;
      }
    };
  }

  static async wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context: string
  ): Promise<ReturnType<T> | undefined> {
    try {
      return await fn();
    } catch (error) {
      Logger.error(`Async error in ${context}`, error);
      return undefined;
    }
  }

  static handle(error: any, context: string) {
    Logger.error(`Exception in ${context}`, error);
  }
}
