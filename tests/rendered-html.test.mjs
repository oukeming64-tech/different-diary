import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the four phase 0 entry points", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/i);
  assert.match(html, /<title>减肥拍拍乐｜先接住你，再说别的<\/title>/i);
  assert.match(html, /你现在需要什么？/);
  assert.match(html, /我想吃点东西/);
  assert.match(html, /我今天不想练/);
  assert.match(html, /我刚练完，很累/);
  assert.match(html, /没什么，只是来坐坐/);
  assert.match(html, /这版只演示交互，不登录，也不会保存你的选择/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("keeps phase 0 free of persistence, auth and network calls", async () => {
  const [page, hosting] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /useState/);
  assert.match(page, /data-testid={`branch-\$\{branch\.id\}`}/);
  assert.doesNotMatch(
    page,
    /fetch\(|axios|indexedDB|localStorage|sessionStorage|signIn|signOut|AIProvider/,
  );
  const hostingConfig = JSON.parse(hosting);
  assert.match(hostingConfig.project_id, /^appgprj_/);
  assert.equal(hostingConfig.d1, null);
  assert.equal(hostingConfig.r2, null);
});
