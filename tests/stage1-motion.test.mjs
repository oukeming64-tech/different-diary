import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readAppSource } from "./app-source.mjs";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("wires an accessible ambient scene made from concrete place objects", async () => {
  const [page, ambient, globals, motion] = await Promise.all([
    readAppSource(),
    read("app/ambient-scene.tsx"),
    read("app/globals.css"),
    read("app/motion.css"),
  ]);
  assert.match(page, /<AmbientScene\s+tone=/, "Home should render AmbientScene");
  assert.match(
    ambient,
    /<div\s+aria-hidden=["']true["']\s+className=\{rootClassName\}/,
    "the ambient scene must stay out of the accessibility tree",
  );
  assert.match(
    `${globals}\n${motion}`,
    /\.ambient-scene\b/,
    "the ambient scene needs a real visual treatment",
  );
  const objectVocabulary = [
    "chair",
    "horizon",
    "reeds",
    "water",
    "window",
    "bench",
    "tree",
    "lamp",
    "table",
    "curtain",
    "shore",
    "path",
  ];
  const sceneObjects = objectVocabulary.filter((objectName) =>
    ambient.includes(`ambient-scene__${objectName}`),
  );
  assert.ok(
    sceneObjects.length >= 2,
    `the scene needs at least two recognizable place objects; found: ${sceneObjects.join(", ") || "none"}`,
  );
  for (const objectName of sceneObjects) {
    assert.match(
      `${globals}\n${motion}`,
      new RegExp(`\\.ambient-scene__${objectName}\\b`),
      `${objectName} must have a concrete CSS treatment`,
    );
  }
  assert.doesNotMatch(
    `${ambient}\n${globals}\n${motion}`,
    /\bambient-scene__(?:orbit|mote)\b/,
    "abstract orbit and mote concepts should not define the environment",
  );
});

test("keeps several explicit, auditable motion hooks", async () => {
  const styles = `${await read("app/globals.css")}\n${await read("app/motion.css")}`;
  const keyframes = [
    ...styles.matchAll(/@keyframes\s+([a-z][\w-]*)/gi),
  ].map((match) => match[1]);
  const declarations = [
    ...styles.matchAll(/\banimation(?:-name)?\s*:\s*([^;}{]+)/gi),
  ].map((match) => match[1]);
  const usedKeyframes = keyframes.filter((name) =>
    declarations.some((declaration) =>
      new RegExp(`(?:^|\\s|,)${name}(?:\\s|,|$)`).test(declaration),
    ),
  );

  assert.ok(
    new Set(keyframes).size >= 3,
    `expected at least three named keyframes, found: ${keyframes.join(", ") || "none"}`,
  );
  assert.ok(
    new Set(usedKeyframes).size >= 3,
    `expected at least three keyframes attached to animation hooks, found: ${usedKeyframes.join(", ") || "none"}`,
  );
});

test("gives branch, reply, saved and timeline views semantic motion classes", async () => {
  const [page, globals, motion] = await Promise.all([
    readAppSource(),
    read("app/globals.css"),
    read("app/motion.css"),
  ]);
  const styles = `${globals}\n${motion}`;
  const requiredMotionClasses = [
    "motion-branch",
    "motion-reply",
    "motion-saved",
    "motion-timeline",
  ];

  for (const className of requiredMotionClasses) {
    assert.match(
      page,
      new RegExp(`className=["'][^"']*\\b${className}\\b[^"']*["']`),
      `${className} should be wired to its product view`,
    );
    assert.match(styles, new RegExp(`\\.${className}\\b`));
  }
});

test("turns off animation and transition for reduced-motion users", async () => {
  const styles = `${await read("app/globals.css")}\n${await read("app/motion.css")}`;
  const reducedMotionStart = styles.indexOf(
    "@media (prefers-reduced-motion: reduce)",
  );

  assert.notEqual(
    reducedMotionStart,
    -1,
    "a prefers-reduced-motion override is required",
  );
  const reducedMotionRules = styles.slice(reducedMotionStart);
  assert.match(
    reducedMotionRules,
    /(?:animation\s*:\s*none|animation-(?:duration|iteration-count)\s*:)/,
  );
  assert.match(reducedMotionRules, /transition-duration\s*:/);
  assert.match(reducedMotionRules, /!important/);
});

test("keeps visual motion local, CSS-driven and lightweight", async () => {
  const [page, ambient, globals, motion] = await Promise.all([
    readAppSource(),
    read("app/ambient-scene.tsx"),
    read("app/globals.css"),
    read("app/motion.css"),
  ]);
  const visualSource = `${page}\n${ambient}\n${globals}\n${motion}`;

  assert.doesNotMatch(
    visualSource,
    /(?:https?:)?\/\/[^\s"')]+/i,
    "motion must not load remote visual resources",
  );
  assert.doesNotMatch(
    visualSource,
    /<canvas\b|\bgetContext\s*\(|\b(?:OffscreenCanvas|WebGLRenderingContext|requestAnimationFrame)\b/i,
    "the calming ambience should use CSS rather than canvas or a custom render loop",
  );
  assert.doesNotMatch(
    visualSource,
    /\b(?:AIProvider|OpenAI|Anthropic|Qwen|OpenRouter|modelKey|signIn|signOut|AuthAdapter|CloudStorageAdapter)\b/i,
    "the visual shell must not introduce AI, login or cloud behavior",
  );
});

test("keeps pressure language out of all user-facing stage 1 responses", async () => {
  const [page, responses] = await Promise.all([
    readAppSource(),
    read("lib/stage1/responses.ts"),
  ]);
  const userFacingCopy = `${page}\n${responses}`;
  const pressurePatterns = [
    ["打卡或连续天数", /(?:打卡|连续天数|连续记录)/],
    ["失败框架", /(?:休息|运动|训练|今天).{0,10}失败/],
    ["补偿或抵消", /(?:补偿|抵消|赎罪)/],
    ["完成率或排行", /(?:完成率|排行榜|排名)/],
    ["强制服从", /(?:必须坚持|不能偷懒|不许休息)/],
  ];
  const violations = pressurePatterns
    .filter(([, pattern]) => pattern.test(userFacingCopy))
    .map(([label]) => label);

  assert.deepEqual(
    violations,
    [],
    `pressure language remains: ${violations.join("、")}`,
  );
});
