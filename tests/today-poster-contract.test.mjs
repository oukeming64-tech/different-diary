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

test("adds a local-only poster as an auxiliary home tool", async () => {
  for (const file of [
    "app/today-poster.tsx",
    "app/today-poster.css",
    "lib/poster/types.ts",
    "lib/poster/today.ts",
    "lib/poster/render.ts",
    "lib/poster/index.ts",
  ]) {
    assert.equal(await exists(file), true, `${file} should exist`);
  }

  const page = await read("app/page.tsx");
  assert.match(page, /生成今天的海报/);
  assert.match(page, /把今天排成一张图/);
  const stateGrid = page.indexOf('className="state-grid state-index"');
  const posterTool = page.indexOf("poster-utility");
  assert.ok(stateGrid >= 0 && posterTool > stateGrid);
});

test("renders and downloads a 3:4 PNG without network, photos or private text", async () => {
  const [component, today, renderer] = await Promise.all([
    read("app/today-poster.tsx"),
    read("lib/poster/today.ts"),
    read("lib/poster/render.ts"),
  ]);
  const source = `${component}\n${today}\n${renderer}`;

  assert.match(renderer, /TODAY_POSTER_WIDTH = 1080/);
  assert.match(renderer, /TODAY_POSTER_HEIGHT = 1440/);
  assert.match(renderer, /canvas\.toBlob/);
  assert.match(renderer, /"image\/png"/);
  assert.match(component, /保存为图片/);
  assert.match(component, /不会上传/);
  assert.match(component, /不放照片、原话、AI 回应或身体数据/);
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource)\b/);
  assert.doesNotMatch(source, /\.userText|\.responseText|thumbnailBlob|\.blob\b/);
  assert.doesNotMatch(source, /OpenRouter|AIProvider|modelKey/i);
});
