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
    "app/activity-reward.tsx",
    "app/activity-reward.css",
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
  assert.match(page, /<ActivityReward\b/);
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
  const [flow, reward, presentation] = await Promise.all([
    read("app/activity-flow.tsx"),
    read("app/activity-reward.tsx"),
    read("lib/stage3/presentation.ts"),
  ]);
  const copy = `${flow}\n${reward}\n${presentation}`;

  for (const label of ["做了什么", "时长", "步数", "距离", "还想留一句"]) {
    assert.match(copy, new RegExp(label));
  }
  assert.match(copy, /每一项都能跳过/);
  assert.match(copy, /不填也没关系/);
  assert.match(copy, /不算完成度/);
  assert.match(presentation, /details\.length \? details\.join\(" · "\) : "动过了"/);
  assert.doesNotMatch(presentation, /动过了，没留下细节/);
  assert.doesNotMatch(
    copy,
    /(?:连续打卡|断签|排行榜|打败.{0,8}用户|补偿运动|热量赤字|失败率)/,
  );
});

test("celebrates the movement itself with a large accessible CSS animation", async () => {
  const [reward, styles] = await Promise.all([
    read("app/activity-reward.tsx"),
    read("app/activity-reward.css"),
  ]);

  assert.match(reward, /刚才那一下，算数/);
  assert.match(reward, /你觉得运动了，[\s\S]{0,80}那就是消耗了。/);
  assert.match(reward, /不用等手表点头/);
  assert.match(reward, /aria-hidden=["']true["']/);
  for (const keyframe of [
    "activity-reward-pop",
    "activity-reward-halo",
    "activity-reward-confetti",
  ]) {
    assert.match(styles, new RegExp(`@keyframes\\s+${keyframe}\\b`));
    assert.match(styles, new RegExp(`animation:[^;]*${keyframe}`));
  }
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(styles, /animation:\s*none\s*!important/);
});

test("keeps stage 3 local-only and provider-free", async () => {
  const sources = await Promise.all(
    [
      "app/activity-flow.tsx",
      "app/activity-reward.tsx",
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
