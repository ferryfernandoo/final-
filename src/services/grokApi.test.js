import test from 'node:test';
import assert from 'node:assert/strict';

if (!globalThis.localStorage) {
  globalThis.localStorage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {},
    clear() {}
  };
}

const { extractStreamingTextFromPayload } = await import('./grokApi.js');

test('extractStreamingTextFromPayload returns delta content', () => {
  const payload = {
    choices: [{ delta: { content: 'Hello ' } }]
  };

  assert.equal(extractStreamingTextFromPayload(payload), 'Hello ');
});

test('extractStreamingTextFromPayload returns message content fallback', () => {
  const payload = {
    choices: [{ message: { content: 'world' } }]
  };

  assert.equal(extractStreamingTextFromPayload(payload), 'world');
});

test('extractStreamingTextFromPayload returns plain text payloads', () => {
  assert.equal(extractStreamingTextFromPayload('plain text'), 'plain text');
});
