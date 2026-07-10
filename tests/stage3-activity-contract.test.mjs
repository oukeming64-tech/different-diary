import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

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

test("keeps movement responsibilities in small explicit units", async () => {
  for (const file of [
    "app/activity-flow.tsx",
    "app/activity-flow.css",
    "lib/stage3/record-activity.ts",
    "lib/stage3/storage.ts",
    "lib/stage3/presentation.ts",
    "lib/stage3/export.ts",
    "lib/stage3/index.ts",
  ]) {
    assert.equal(await exists(file), true, `${file} should exist`);
  }

  const page = await read("app/page.tsx");
  assert.match(page, /<ActivityFlow\b/);
  assert.match(page, /recordActivityLocally\s*\(/);
  assert.doesNotMatch(
    page,
    /const\s+ACTIVITY_CATEGORY_LABELS\b/,
    "category presentation belongs with the movement feature, not the page shell",
  );
});

test("keeps the four emotional entries primary and movement auxiliary", async () => {
  const page = await read("app/page.tsx");
  const stateGrid = page.indexOf('className="state-grid state-index"');
  const activityUtility = page.indexOf("activity-utility");

  assert.ok(stateGrid >= 0);
  assert.ok(activityUtility > stateGrid);
  assert.match(page, /aria-label=["']四个核心入口["']/);
  assert.match(page, /记一下运动/);
  assert.doesNotMatch(page, /aria-label=["']五个核心入口["']/);
});

test("makes every movement detail optional and keeps scoring out", async () => {
  const [flow, presentation] = await Promise.all([
    read("app/activity-flow.tsx"),
    read("lib/stage3/presentation.ts"),
  ]);
  const copy = `${flow}\n${presentation}`;

  for (const label of ["做了什么", "时长", "步数", "距离", "还想留一句"]) {
    assert.match(copy, new RegExp(label));
  }
  assert.match(copy, /每一项都能跳过/);
  assert.match(copy, /不填也没关系/);
  assert.match(copy, /不算完成度/);
  assert.doesNotMatch(
    copy,
    /(?:连续打卡|断签|排行榜|打败.{0,8}用户|补偿运动|热量赤字|失败率)/,
  );
});

test("keeps stage 3 local-only and provider-free", async () => {
  const sources = await Promise.all(
    [
      "app/activity-flow.tsx",
      "lib/stage3/record-activity.ts",
      "lib/stage3/storage.ts",
      "lib/stage3/presentation.ts",
      "lib/stage3/export.ts",
    ].map(read),
  );
  const source = sources.join("\n");

  assert.doesNotMatch(
    source,
    /\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|axios)\b/,
  );
  assert.doesNotMatch(source, /https?:\/\//);
  assert.doesNotMatch(
    source,
    /\b(?:AIProvider|OpenAI|Anthropic|Qwen|OpenRouter|modelKey|signIn|AuthAdapter|SyncAdapter|CloudStorageAdapter)\b/i,
  );
});
