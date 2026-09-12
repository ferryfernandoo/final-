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

const { extractStreamingTextFromPayload, resolveModelForRequest, getTokenMixModel } = await import('./grokApi.js');

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

test('resolveModelForRequest returns llama-4-maverick for text chat', () => {
  assert.equal(resolveModelForRequest('deepernova 1.0super flash', false), 'llama-4-maverick');
  assert.equal(resolveModelForRequest('deepernova-2.3-pro', false), 'llama-4-maverick');
});

test('getTokenMixModel uses llama-4-maverick for both text and image payloads', async () => {
  const { getTokenMixModel } = await import('./grokApi.js');
  assert.equal(getTokenMixModel('deepernova 1.0super flash', false), 'llama-4-maverick');
  assert.equal(getTokenMixModel('deepernova-2.3-pro', true), 'llama-4-maverick');
});
test('resolveModelForRequest returns llama-4-maverick', () => {
  assert.equal(resolveModelForRequest('deepernova 1.0super flash', true), 'llama-4-maverick');
  assert.equal(resolveModelForRequest('deepernova-2.3-pro', true), 'llama-4-maverick');
  assert.equal(resolveModelForRequest('deepernova-4.6-giga', true), 'llama-4-maverick');
});

test('getTokenMixModel routes spaced Deepernova aliases to llama-4-maverick', () => {
  assert.equal(getTokenMixModel('deepernova 1.0 super flash', true), 'llama-4-maverick');
  assert.equal(getTokenMixModel('deepernova 2.4 pro', false), 'llama-4-maverick');
});
