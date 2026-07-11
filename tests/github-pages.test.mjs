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

test("builds a scoped static GitHub Pages experience", async () => {
  for (const file of [
    "github-pages/index.html",
    "github-pages/main.tsx",
    "vite.config.ts",
    ".github/workflows/pages.yml",
    "public/manifest.webmanifest",
    "public/download.html",
    "scripts/build-standalone-html.mjs",
  ]) {
    assert.equal(await exists(file), true, `${file} should exist`);
  }

  const [packageJson, config, workflow, manifest, registration, worker] =
    await Promise.all([
      read("package.json"),
      read("vite.config.ts"),
      read(".github/workflows/pages.yml"),
      read("public/manifest.webmanifest"),
      read("app/pwa-register.tsx"),
      read("public/sw.js"),
    ]);

  assert.match(packageJson, /"build:pages"/);
  assert.match(packageJson, /--base=\/different-diary\//);
  assert.match(packageJson, /build-standalone-html\.mjs/);
  assert.match(config, /root:\s*["']github-pages["']/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /npm run build:pages/);
  assert.match(manifest, /"start_url":\s*"\.\/"/);
  assert.match(registration, /document\.baseURI/);
  assert.match(worker, /self\.registration\.scope/);
  assert.match(worker, /buildAssets/);
  assert.match(worker, /shellHtml\.matchAll/);
  assert.match(worker, /responseForCache/);
  assert.match(worker, /"vary"/);
  assert.doesNotMatch(worker, /_next\/static/);
});
