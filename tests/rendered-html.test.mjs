import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { readAppSource } from "./app-source.mjs";

test("builds the static local-first app shell", async () => {
  const [html, appSource] = await Promise.all([
    readFile(new URL("../dist-pages/index.html", import.meta.url), "utf8"),
    readAppSource(),
  ]);

  assert.match(html, /<html lang="zh-CN">/i);
  assert.match(html, /<title>不一样的日记｜先接住你，再说别的<\/title>/i);
  assert.match(html, /<div id="root"><\/div>/i);
  assert.match(html, /<script type="module"[^>]+src=/i);

  for (const copy of [
    "你这会儿，",
    "想从哪儿说起？",
    "我想吃点东西",
    "我今天不想练",
    "我刚练完，很累",
    "没什么，只是来坐坐",
    "翻翻最近",
  ]) {
    assert.match(appSource, new RegExp(copy));
  }
  assert.doesNotMatch(appSource, /先不用交作业|你更像哪一句|像翻开几页/);
  assert.doesNotMatch(appSource, /阶段 0 原型|不会保存你的选择/);
});

test("keeps product data device-local and free of server capabilities", async () => {
  const [appSource, packageJson] = await Promise.all([
    readAppSource(),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(appSource, /useState/);
  assert.match(appSource, /data-testid={`branch-\$\{branch\.id\}`}/);
  assert.match(appSource, /ensureLocalIdentity/);
  assert.match(appSource, /saveCheckIn/);
  assert.match(appSource, /createLocalExportJson/);
  assert.doesNotMatch(
    appSource,
    /axios|sessionStorage|signIn|signOut|SyncAdapter/,
  );
  const localPreferenceCalls = [
    ...appSource.matchAll(/localStorage\.(?:getItem|setItem)\(([^)]*)\)/g),
  ];
  assert.equal(localPreferenceCalls.length, 2);
  assert.ok(
    localPreferenceCalls.every((match) =>
      match[1]?.includes("ONBOARDING_PREFERENCE_KEY"),
    ),
    "localStorage may only hold the dismissed onboarding preference",
  );
  assert.match(packageJson, /"dexie"/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|cloudflare|drizzle|prisma|supabase|firebase/i);
});
