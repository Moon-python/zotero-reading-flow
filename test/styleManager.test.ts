import test from 'node:test';
import assert from 'node:assert/strict';
import { StyleManager } from '../src/styleManager';

test('injectLocale registers the Fluent file by locale href, not rootURI path', () => {
  const calls: string[] = [];
  const mozXULElement = {
    insertFTLIfNeeded(href: string) {
      calls.push(href);
    }
  };

  const manager = new StyleManager();
  manager.injectLocale({ MozXULElement: mozXULElement } as any, 'jar:file:///plugin.xpi!/');

  assert.deepEqual(calls, ['reading-flow.ftl']);
});
