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

test('resolveModelForRequest keeps the selected Deepernova tier for text chat', () => {
  assert.equal(resolveModelForRequest('deepernova-1.2-flash', false), 'deepernova-1.2-flash');
  assert.equal(resolveModelForRequest('deepernova-2.3-pro', false), 'deepernova-2.3-pro');
});

test('getTokenMixModel uses gpt-5.6-luna for both text and image payloads', async () => {
  const { getTokenMixModel } = await import('./grokApi.js');
  assert.equal(getTokenMixModel('deepernova-1.2-flash', false), 'gpt-5.6-luna');
  assert.equal(getTokenMixModel('deepernova-2.3-pro', true), 'gpt-5.6-luna');
});
test('resolveModelForRequest escalates image requests to a stronger tier', () => {
  assert.equal(resolveModelForRequest('deepernova-1.2-flash', true), 'deepernova-2.3-pro');
  assert.equal(resolveModelForRequest('deepernova-2.3-pro', true), 'deepernova-4.6-giga');
  assert.equal(resolveModelForRequest('deepernova-4.6-giga', true), 'deepernova-4.6-giga');
});

test('getTokenMixModel routes spaced Deepernova aliases to gpt-5.6-luna', () => {
  assert.equal(getTokenMixModel('deepernova 2.4 pro', true), 'gpt-5.6-luna');
  assert.equal(getTokenMixModel('deepernova 2.4 pro', false), 'gpt-5.6-luna');
});
