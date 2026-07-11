import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const budgets = new Map([
  ["app/page.tsx", 20],
  ["app/diary/diary-app.tsx", 150],
  ["app/diary/home-screen.tsx", 180],
  ["app/diary/conversation-screens.tsx", 280],
  ["app/diary/memory-screens.tsx", 320],
  ["app/diary/use-diary-controller.ts", 420],
  ["app/diary/use-local-diary-library.ts", 180],
  ["app/diary/use-photo-draft.ts", 80],
  ["app/diary/model.ts", 180],
  ["app/diary/shared.tsx", 100],
]);

test("keeps the diary shell split by responsibility", async () => {
  for (const [file, maximumLines] of budgets) {
    const source = await readFile(new URL(file, root), "utf8");
    const lines = source.split("\n").length;
    assert.ok(
      lines <= maximumLines,
      `${file} should stay within ${maximumLines} lines; received ${lines}`,
    );
  }

  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /<DiaryApp\s*\/>/);
  assert.doesNotMatch(page, /useState|useEffect|IndexedDB|OpenRouter/);
});
