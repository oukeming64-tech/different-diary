import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const processorPath = "lib/stage2/image-processor.ts";
const recordOnlyPath = "lib/stage2/record-only.ts";

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

async function readOptional(relativePath) {
  try {
    return await read(relativePath);
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

async function exists(relativePath) {
  try {
    await access(new URL(relativePath, root));
    return true;
  } catch {
    return false;
  }
}

test("creates explicit local-only stage 2 photo modules", async () => {
  assert.equal(
    await exists(processorPath),
    true,
    `${processorPath} must own browser-side image processing`,
  );
  assert.equal(
    await exists(recordOnlyPath),
    true,
    `${recordOnlyPath} must own the zero-network record-only path`,
  );
});

test("bounds and re-encodes images entirely in the browser", async () => {
  const processor = await readOptional(processorPath);

  assert.match(
    processor,
    /export\s+const\s+MAX_IMAGE_LONG_EDGE_PX\s*=\s*[\d_]+/,
    "the processor needs one auditable longest-edge limit",
  );
  assert.match(
    processor,
    /export\s+const\s+MAX_IMAGE_FILE_BYTES\s*=\s*(?:[\d_]+|[\d.]+\s*\*\s*1024(?:\s*\*\s*1024)?)/,
    "the processor needs one auditable output-byte limit",
  );
  assert.match(
    processor,
    /(?:createImageBitmap\s*\(|new\s+OffscreenCanvas\s*\(|createElement\(\s*["']canvas["']\s*\))/,
    "the original must be decoded into a local re-encoding surface",
  );
  assert.match(
    processor,
    /(?:toBlob\s*\(|convertToBlob\s*\()/,
    "the processor must produce a newly encoded Blob",
  );
  assert.match(
    processor,
    /image\/(?:jpeg|webp)/,
    "processed photos must use an explicit metadata-free JPEG or WebP output",
  );
  assert.doesNotMatch(
    processor,
    /\bFileReader\s*\([^)]*readAsDataURL|\bdata:image\//,
    "the processor should not turn the original into a persistent data URL",
  );
});

test("forbids network APIs in processing and record-only code", async () => {
  const [processor, recordOnly] = await Promise.all([
    readOptional(processorPath),
    readOptional(recordOnlyPath),
  ]);
  const localPhotoSource = `${processor}\n${recordOnly}`;

  assert.doesNotMatch(
    localPhotoSource,
    /\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|axios)\b/,
    "local photo modules must not contain any network primitive",
  );
  assert.doesNotMatch(
    localPhotoSource,
    /https?:\/\//,
    "local photo modules must not contain remote endpoints",
  );
});

test("offers a user-triggered image picker with explicit no-send copy", async () => {
  const [page, photoFlow] = await Promise.all([
    read("app/page.tsx"),
    read("app/photo-flow.tsx"),
  ]);
  const photoUi = `${page}\n${photoFlow}`;
  const fileInputs = [...photoUi.matchAll(/<input\b[^>]*>/g)].map(
    (match) => match[0],
  );
  const imageInput = fileInputs.find((input) =>
    /\btype=["']file["']/.test(input),
  );

  assert.ok(imageInput, "the page must render a user-operated file input");
  assert.match(imageInput, /\baccept=["']image\/\*["']/);
  assert.match(imageInput, /\bonChange=/, "selection must start from a user change event");
  assert.ok(
    /\bhtmlFor=/.test(photoUi) || /\.current\?*\.click\s*\(/.test(photoUi),
    "a visible user action must open the image input",
  );
  assert.match(
    photoUi,
    /(?:不识别|不会识别|不做识别)/,
    "the local path must say that it does not recognize the image",
  );
  assert.match(
    photoUi,
    /(?:不发送|不会发送|不上传|不会上传)/,
    "the local path must say that it does not send the image",
  );
});

test("keeps photos out of the service-worker cache", async () => {
  const worker = await read("public/sw.js");
  const hasDirectProtocolGuard =
    /url\.protocol\s*===\s*["']blob:["'][\s\S]{0,240}url\.protocol\s*===\s*["']data:["'][\s\S]{0,120}return/.test(
      worker,
    ) ||
    /url\.protocol\s*===\s*["']data:["'][\s\S]{0,240}url\.protocol\s*===\s*["']blob:["'][\s\S]{0,120}return/.test(
      worker,
    );
  const hasProtocolSetGuard =
    /new Set\(\[[^\]]*["']blob:["'][^\]]*["']data:["'][^\]]*\]\)/s.test(
      worker,
    ) && /\.has\(\s*url\.protocol\s*\)/.test(worker);

  assert.ok(
    hasDirectProtocolGuard || hasProtocolSetGuard,
    "the worker must explicitly reject blob: and data: requests",
  );
  assert.ok(
    /APP_SHELL\.includes\(\s*url\.pathname\s*\)/.test(worker) ||
      /url\.pathname\.startsWith\(\s*["']\/assets\/["']\s*\)/.test(worker),
    "runtime caching must be limited to the app shell or build-owned assets",
  );
  const appShell = worker.match(/const\s+APP_SHELL\s*=\s*\[([\s\S]*?)\];/)?.[1] ?? "";
  assert.doesNotMatch(appShell, /(?:blob:|data:|provider|model|photo)/i);
  assert.match(worker, /url\.origin !== self\.location\.origin/);
});

test("keeps the four emotional entries primary and photos auxiliary", async () => {
  const page = await read("app/page.tsx");
  const fourEntryLabels = [
    "我想吃点东西",
    "我今天不想练",
    "我刚练完，很累",
    "没什么，只是来坐坐",
  ];
  for (const label of fourEntryLabels) assert.match(page, new RegExp(label));

  assert.match(page, /aria-label=["']四个核心入口["']/);
  const entryPosition = page.indexOf("state-grid");
  const photoToolMatch = page.match(
    /className=["'][^"']*\bphoto-(?:tool|utility|action)\b[^"']*["']/,
  );
  assert.ok(photoToolMatch, "the photo feature needs an explicitly auxiliary class");
  assert.ok(
    entryPosition >= 0 && entryPosition < (photoToolMatch.index ?? -1),
    "the four emotional entries must appear before the auxiliary photo tool",
  );
});

test("keeps the stage 2 record-only photo path free of login, cloud storage and AI calls", async () => {
  const [photoFlow, processor, recordOnly, hosting, packageJson] = await Promise.all([
    read("app/photo-flow.tsx"),
    readOptional(processorPath),
    readOptional(recordOnlyPath),
    read(".openai/hosting.json").then(JSON.parse),
    read("package.json").then(JSON.parse),
  ]);
  const firstSliceSource = `${photoFlow}\n${processor}\n${recordOnly}`;
  const dependencies = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }).join("\n");

  assert.equal(await exists("app/api"), false);
  assert.equal(await exists("pages/api"), false);
  assert.equal(hosting.d1, null);
  assert.equal(hosting.r2, null);
  assert.doesNotMatch(
    firstSliceSource,
    /\b(?:fetch|XMLHttpRequest|sendBeacon|AIProvider|OpenAI|Anthropic|Qwen|OpenRouter|modelKey|signIn|signOut|AuthAdapter|SyncAdapter|CloudStorageAdapter)\b/i,
    "the first photo slice must remain local and provider-free",
  );
  assert.doesNotMatch(
    dependencies,
    /\b(?:openai|anthropic|firebase|supabase|auth0|clerk|posthog|sentry)\b/i,
    "the first photo slice must not add AI, cloud, auth or telemetry SDKs",
  );
});
