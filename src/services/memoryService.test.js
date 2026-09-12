import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    }
  };
}

// Mock fetch for node environment if needed
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ success: true })
  });
}

import { memoryService } from './memoryService.js';

test('MemoryService: saves memory autonomously and updates active profile', async () => {
  memoryService.clearMemories();

  const saveRes = await memoryService.executeAction({
    action: 'save',
    content: 'Frontend developer yang menyukai React dan Tailwind, hindari jQuery',
    category: 'preference'
  }, { isGuest: true, language: 'id' });

  assert.equal(saveRes.success, true);
  assert.equal(saveRes.action, 'save');
  assert.match(saveRes.displayMessage, /Memori disimpan/i);

  const profile = memoryService.getActiveMemoryProfile('id', 5);
  assert.match(profile, /PROFIL MEMORI PENGGUNA/i);
  assert.match(profile, /React dan Tailwind/i);
});

test('MemoryService: updates existing memory autonomously', async () => {
  const updateRes = await memoryService.executeAction({
    action: 'update',
    target: 'React',
    content: 'Frontend developer yang kini menggunakan Svelte dan Tailwind',
    category: 'preference'
  }, { isGuest: true, language: 'id' });

  assert.equal(updateRes.success, true);
  assert.equal(updateRes.action, 'update');
  assert.match(updateRes.displayMessage, /Memori diperbarui/i);

  const profile = memoryService.getActiveMemoryProfile('id', 5);
  assert.match(profile, /Svelte/i);
});

test('MemoryService: deletes memory autonomously', async () => {
  const deleteRes = await memoryService.executeAction({
    action: 'delete',
    target: 'Svelte'
  }, { isGuest: true, language: 'id' });

  assert.equal(deleteRes.success, true);
  assert.equal(deleteRes.action, 'delete');
  assert.match(deleteRes.displayMessage, /Memori dihapus/i);

  const profile = memoryService.getActiveMemoryProfile('id', 5);
  assert.doesNotMatch(profile, /Svelte/i);
});

test('MemoryService: recalls memory on-demand', async () => {
  await memoryService.executeAction({
    action: 'save',
    content: 'Pengguna memiliki kucing bernama Mochi ras Persia',
    category: 'fact'
  }, { isGuest: true });

  const recallRes = await memoryService.executeAction({
    action: 'recall',
    query: 'Mochi'
  }, { isGuest: true, language: 'id' });

  assert.equal(recallRes.success, true);
  assert.equal(recallRes.action, 'recall');
  assert.ok(recallRes.results.length > 0);
  assert.match(recallRes.results[0].content, /Mochi/i);
});
