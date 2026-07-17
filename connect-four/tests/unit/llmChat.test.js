import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callOpenAIChat } from '../../server/llmChat.js';

function fakeFetchOk({ content = 'hello', promptTokens = 10, completionTokens = 5, totalTokens = 15 } = {}) {
  return async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content } }],
      usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens },
    }),
  });
}

function makeRecordUsageStub() {
  const calls = [];
  const stub = async (args) => { calls.push(args); };
  stub.calls = calls;
  return stub;
}

test('callOpenAIChat: successful call returns content + usage', async () => {
  const recordUsageImpl = makeRecordUsageStub();
  const result = await callOpenAIChat('prompt', {
    model: 'gpt-5.4-mini',
    apiKey: 'key',
    endpoint: 'test-endpoint',
    purpose: 'unit-test',
    fetchImpl: fakeFetchOk(),
    recordUsageImpl,
  });
  assert.equal(result.content, 'hello');
  assert.deepEqual(result.usage, { promptTokens: 10, completionTokens: 5, totalTokens: 15 });
});

test('callOpenAIChat: recordUsage called with correct costUsd for a known model', async () => {
  const recordUsageImpl = makeRecordUsageStub();
  await callOpenAIChat('prompt', {
    model: 'gpt-5.4-mini',
    apiKey: 'key',
    endpoint: 'test-endpoint',
    purpose: 'unit-test',
    userId: 'user-1',
    fetchImpl: fakeFetchOk({ promptTokens: 1_000_000, completionTokens: 1_000_000, totalTokens: 2_000_000 }),
    recordUsageImpl,
  });

  // Flush the fire-and-forget microtask before asserting.
  await Promise.resolve(); await Promise.resolve();

  assert.equal(recordUsageImpl.calls.length, 1);
  const call = recordUsageImpl.calls[0];
  assert.equal(call.endpoint, 'test-endpoint');
  assert.equal(call.purpose, 'unit-test');
  assert.equal(call.userId, 'user-1');
  assert.equal(call.model, 'gpt-5.4-mini');
  assert.equal(typeof call.costUsd, 'number');
  assert.ok(call.costUsd > 0, 'costUsd should be a positive number for a priced model');
  // gpt-5.4-mini: $0.25/1M input + $2.00/1M output -> 1M+1M tokens = 0.25 + 2.00 = 2.25
  assert.ok(Math.abs(call.costUsd - 2.25) < 1e-9, `expected ~2.25, got ${call.costUsd}`);
});

test('callOpenAIChat: unpriced model still records usage with costUsd null', async () => {
  const recordUsageImpl = makeRecordUsageStub();
  await callOpenAIChat('prompt', {
    model: 'some-unpriced-model',
    apiKey: 'key',
    endpoint: 'test-endpoint',
    purpose: 'unit-test',
    fetchImpl: fakeFetchOk(),
    recordUsageImpl,
  });

  await Promise.resolve(); await Promise.resolve();

  assert.equal(recordUsageImpl.calls.length, 1);
  assert.equal(recordUsageImpl.calls[0].costUsd, null);
});

test('callOpenAIChat: thrown fetch error propagates and recordUsage is never called', async () => {
  const recordUsageImpl = makeRecordUsageStub();
  const failingFetch = async () => { throw new Error('network down'); };

  await assert.rejects(
    () => callOpenAIChat('prompt', {
      model: 'gpt-5.4-mini',
      apiKey: 'key',
      endpoint: 'test-endpoint',
      purpose: 'unit-test',
      fetchImpl: failingFetch,
      recordUsageImpl,
    }),
    /network down/,
  );

  await Promise.resolve(); await Promise.resolve();
  assert.equal(recordUsageImpl.calls.length, 0);
});

test('callOpenAIChat: non-2xx response throws and recordUsage is never called', async () => {
  const recordUsageImpl = makeRecordUsageStub();
  const failingFetch = async () => ({
    ok: false,
    status: 500,
    text: async () => 'internal server error',
  });

  await assert.rejects(
    () => callOpenAIChat('prompt', {
      model: 'gpt-5.4-mini',
      apiKey: 'key',
      endpoint: 'test-endpoint',
      purpose: 'unit-test',
      fetchImpl: failingFetch,
      recordUsageImpl,
    }),
    /OpenAI API error 500/,
  );

  await Promise.resolve(); await Promise.resolve();
  assert.equal(recordUsageImpl.calls.length, 0);
});

test('callOpenAIChat: response_format retry fires exactly once, not in a loop', async () => {
  const recordUsageImpl = makeRecordUsageStub();
  let callCount = 0;
  const fetchImpl = async (_url, options) => {
    callCount++;
    const body = JSON.parse(options.body);
    if (body.response_format) {
      // Reject with a response_format-shaped error every time useJsonFormat is set,
      // so a buggy implementation that loops would call this indefinitely.
      return { ok: false, status: 400, text: async () => 'Unsupported parameter: response_format' };
    }
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok without json format' } }],
        usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
      }),
    };
  };

  const result = await callOpenAIChat('prompt', {
    model: 'gpt-5.4-mini',
    apiKey: 'key',
    endpoint: 'test-endpoint',
    purpose: 'unit-test',
    useJsonFormat: true,
    fetchImpl,
    recordUsageImpl,
  });

  assert.equal(callCount, 2, 'expected exactly one retry (2 total fetch calls)');
  assert.equal(result.content, 'ok without json format');
});
