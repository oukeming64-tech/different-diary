import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { readAppSource } from "./app-source.mjs";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

async function exists(relativePath) {
  try {
    await access(new URL(relativePath, root));
    return true;
  } catch {
    return false;
  }
}

test("keeps the first stage 4 slice explicit and optional", async () => {
  for (const file of [
    "app/ai-flow.tsx",
    "app/ai-flow.css",
    "app/onboarding-guide.tsx",
    "app/onboarding-guide.css",
    "lib/stage4/types.ts",
    "lib/stage4/openrouter.ts",
    "lib/stage4/companion.ts",
    "lib/stage4/index.ts",
  ]) {
    assert.equal(await exists(file), true, `${file} should exist`);
  }

  const [page, flow] = await Promise.all([
    readAppSource(),
    read("app/ai-flow.tsx"),
  ]);
  assert.match(page, /想让 AI 再听听/);
  assert.match(flow, /发送给 OpenRouter/);
  assert.match(flow, /照片、历史记录和身体资料不会一起发送/);
  assert.match(flow, /Key 不会保存/);
  assert.match(flow, /离开或刷新后，需要重新连接/);
});

test("shows new users how to reach optional AI without making it a core entry", async () => {
  const [page, guide] = await Promise.all([
    readAppSource(),
    read("app/onboarding-guide.tsx"),
  ]);

  assert.match(page, /localRecords\.length === 0/);
  assert.match(page, /ONBOARDING_PREFERENCE_KEY/);
  assert.match(page, /第一次来？30 秒看看怎么用/);
  assert.match(page, /可选 AI 藏在哪里/);
  assert.match(page, /ai-discovery-label/);
  assert.match(guide, /aria-modal="true"/);
  assert.match(guide, /先挑一句，像你现在就好/);
  assert.match(guide, /先听一句本机回应/);
  assert.match(guide, /想多说一点，再找 AI/);
  assert.match(guide, /回应页靠下的位置 · 可选 AI/);
  assert.match(guide, /知道了，去选一句/);
  assert.match(page, /localStorage\.setItem\(ONBOARDING_PREFERENCE_KEY, "done"\)/);
  assert.doesNotMatch(guide, /OPENROUTER|api[_-]?key|model[_-]?key/i);

  const stateGrid = page.indexOf('className="state-grid state-index"');
  const aiAction = page.indexOf('className="memory-action-card hairline-row ai-utility"');
  assert.ok(stateGrid >= 0 && aiAction > stateGrid);
});

test("keeps keys out of persistent product data and build-time variables", async () => {
  const [flow, provider, types, database] = await Promise.all([
    read("app/ai-flow.tsx"),
    read("lib/stage4/openrouter.ts"),
    read("lib/stage1/types.ts"),
    read("lib/stage1/db.ts"),
  ]);
  const stage4Source = `${flow}\n${provider}`;

  assert.doesNotMatch(stage4Source, /localStorage|sessionStorage|indexedDB|import\.meta\.env|process\.env/);
  assert.doesNotMatch(`${types}\n${database}`, /(?:api|model|openrouter)[_-]?key/i);
  assert.match(provider, /Authorization: `Bearer \$\{normalizeKey\(key\)\}`/);
  assert.match(provider, /https:\/\/openrouter\.ai\/api\/v1/);
});

test("preserves local-only photo and movement modules beside optional AI", async () => {
  const localSources = await Promise.all(
    [
      "app/photo-flow.tsx",
      "lib/stage2/image-processor.ts",
      "lib/stage2/record-only.ts",
      "app/activity-flow.tsx",
      "lib/stage3/record-activity.ts",
      "lib/stage3/storage.ts",
    ].map(read),
  );
  const source = localSources.join("\n");

  assert.doesNotMatch(source, /openrouter\.ai|OPENROUTER|Authorization|\bfetch\s*\(/i);
  assert.doesNotMatch(source, /AIProvider|modelKey/i);
});
