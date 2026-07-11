import assert from "node:assert/strict";
import test from "node:test";

import {
  OpenRouterProvider,
  isSafeCompanionResponse,
  requestCompanionResponse,
  type AIProvider,
  type CompanionInput,
} from "../lib/stage4";

const input: CompanionInput = {
  state: "rest",
  stateLabel: "今天不想练",
  intentLabel: "今天就休息",
  localResponse: "好，今天就休息。休息本身不需要找理由。",
  userText: "我今天真的很累，只想躺一会儿。",
};

test("validates and calls OpenRouter without placing the key in the request body", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith("/key")) {
      return new Response(JSON.stringify({ data: { label: "test" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({
        model: "example/free-model",
        choices: [{ message: { content: "累了就躺一会儿。今天不用补交什么。" } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const provider = new OpenRouterProvider({ fetchImpl: fakeFetch, timeoutMs: 1000 });
  await provider.validateKey("secret-for-test");
  const response = await provider.respond("secret-for-test", input);

  assert.equal(response.model, "example/free-model");
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.init?.headers && (calls[0].init.headers as Record<string, string>).Authorization, "Bearer secret-for-test");
  const requestBody = String(calls[1]?.init?.body);
  assert.doesNotMatch(requestBody, /secret-for-test/);
  assert.match(requestBody, /openrouter\/free/);
  assert.match(requestBody, /不评价自律/);
  assert.match(requestBody, /我今天真的很累/);
});

test("falls back to the reviewed local response when the provider is unavailable", async () => {
  const provider: AIProvider = {
    id: "unavailable-test",
    async validateKey() {},
    async respond() {
      throw new Error("offline");
    },
  };

  const result = await requestCompanionResponse({
    provider,
    key: "unused",
    input,
  });

  assert.equal(result.source, "local");
  assert.equal(result.text, input.localResponse);
  assert.match(result.notice, /你写的话还在这里/);
});

test("rejects pressure language and keeps the local response", async () => {
  assert.equal(isSafeCompanionResponse("今天必须把吃掉的热量运动消耗掉。"), false);
  const provider: AIProvider = {
    id: "unsafe-test",
    async validateKey() {},
    async respond() {
      return {
        model: "unsafe-model",
        text: "今天必须把吃掉的热量运动消耗掉。",
      };
    },
  };

  const result = await requestCompanionResponse({
    provider,
    key: "unused",
    input,
  });

  assert.equal(result.source, "local");
  assert.equal(result.text, input.localResponse);
});
