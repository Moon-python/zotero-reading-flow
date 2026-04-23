import { LRUCache } from './lruCache';
import { Logger } from './Logger';

export interface FlowData {
  v: number;
  p: { [attId: string]: number }; // Progress
  c: string | null; // Color hex
  s: string | null; // Status badge
  ts: number; // Timestamp
}

const PREFIX = "ReadingFlow: ";
const DEFAULT_DATA: FlowData = { v: 1, p: {}, c: null, s: null, ts: 0 };

export class DataStore {
  private cache = new LRUCache<number, FlowData>(2000);

  public getData(item: any): FlowData {
    const id = item.id;
    const cached = this.cache.get(id);
    if (cached) return cached;

    const extra = item.getField('extra') || '';
    const match = extra.split('\n').find((line: string) => line.startsWith(PREFIX));
    
    let data = { ...DEFAULT_DATA };
    if (match) {
      try {
        const parsed = JSON.parse(match.substring(PREFIX.length));
        data = { ...DEFAULT_DATA, ...parsed };
      } catch (e) {
        Logger.error(`ReadingFlow: Failed to parse data for ${id}`, e);
      }
    }
    
    this.cache.set(id, data);
    return data;
  }

  public async updateData(item: any, updates: Partial<FlowData>) {
    if (item.isDirty()) {
      Logger.warn('ReadingFlow: Item dirty, skipping write to prevent race condition');
      return;
    }

    const current = this.getData(item);
    
    // Last write wins check
    if (updates.ts && updates.ts < current.ts) return;

    const merged: FlowData = { ...current, ...updates, ts: Date.now() };
    this.cache.set(item.id, merged);

    let extra = item.getField('extra') || '';
    const lines = extra.split('\n').filter((line: string) => !line.startsWith(PREFIX));
    lines.push(`${PREFIX}${JSON.stringify(merged)}`);
    
    item.setField('extra', lines.join('\n'));
    await item.saveTx();
  }

  public clearCache(itemId: number) {
    this.cache.delete(itemId);
  }
}
