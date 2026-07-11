import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

async function pngDimensions(relativePath) {
  const data = await readFile(new URL(relativePath, root));
  assert.equal(
    data.subarray(0, 8).toString("hex"),
    "89504e470d0a1a0a",
    `${relativePath} should be a PNG file`,
  );
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

async function exists(relativePath) {
  try {
    await access(new URL(relativePath, root));
    return true;
  } catch {
    return false;
  }
}

async function sourceFiles(relativeDirectory) {
  const directory = new URL(`${relativeDirectory}/`, root);
  if (!(await exists(relativeDirectory))) return [];

  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) return sourceFiles(relativePath);
      return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [relativePath] : [];
    }),
  );
  return nested.flat();
}

test("provides an installable, same-origin-only PWA shell", async () => {
  const requiredFiles = [
    "app/manifest.ts",
    "app/pwa-register.tsx",
    "public/sw.js",
    "public/manifest.webmanifest",
    "public/app-icon-192.png",
    "public/app-icon-512.png",
  ];
  for (const file of requiredFiles) {
    assert.equal(await exists(file), true, `${file} should exist`);
  }

  const [manifest, registration, worker, layout] = await Promise.all([
    read("app/manifest.ts"),
    read("app/pwa-register.tsx"),
    read("public/sw.js"),
    read("app/layout.tsx"),
  ]);

  assert.match(manifest, /name:\s*["']不一样的日记["']/);
  assert.match(manifest, /start_url:\s*["']\/["']/);
  assert.match(manifest, /scope:\s*["']\/["']/);
  assert.match(manifest, /display:\s*["']standalone["']/);
  assert.match(manifest, /\/app-icon-192\.png/);
  assert.match(manifest, /\/app-icon-512\.png/);
  assert.deepEqual(await pngDimensions("public/app-icon-192.png"), {
    width: 192,
    height: 192,
  });
  assert.deepEqual(await pngDimensions("public/app-icon-512.png"), {
    width: 512,
    height: 512,
  });

  assert.match(registration, /navigator\.serviceWorker\.register/);
  assert.match(registration, /document\.baseURI/);
  assert.match(registration, /PWA_UPDATE_READY_EVENT/);
  assert.match(registration, /waiting\.postMessage\(\{ type: ["']SKIP_WAITING["'] \}\)/);
  assert.match(registration, /稍后再说/);
  assert.match(layout, /<PwaRegister\s*\/>/);

  assert.match(worker, /self\.addEventListener\(["']install["']/);
  assert.match(worker, /self\.addEventListener\(["']activate["']/);
  assert.match(worker, /self\.addEventListener\(["']fetch["']/);
  assert.match(worker, /request\.method !== ["']GET["']/);
  assert.match(worker, /url\.origin !== self\.location\.origin/);
  assert.match(worker, /APP_SHELL\.includes\(url\.pathname\)/);
  assert.match(worker, /self\.registration\.scope/);
  assert.match(worker, /url\.pathname\.startsWith\(scopedPath\(["']\/assets\/["']\)\)/);
  assert.doesNotMatch(worker, /cache\.put\([^\n]*\/api\//);
  assert.doesNotMatch(worker, /\bindexedDB\s*[.(]/);
  assert.doesNotMatch(worker, /https?:\/\//);
});

test("keeps the stage 1 local core serverless and free of auth, AI and telemetry", async () => {
  const runtimeFiles = await sourceFiles("lib/stage1");
  const sources = await Promise.all(runtimeFiles.map((file) => read(file)));
  const runtimeSource = sources.join("\n");
  const packageJson = JSON.parse(await read("package.json"));
  const hosting = JSON.parse(await read(".openai/hosting.json"));
  const dependencyNames = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }).join("\n");

  assert.equal(await exists("app/api"), false, "stage 1 must not add API routes");
  assert.equal(await exists("pages/api"), false, "stage 1 must not add API routes");
  assert.equal(hosting.d1, null, "stage 1 must not provision a server database");
  assert.equal(hosting.r2, null, "stage 1 must not provision cloud storage");

  assert.doesNotMatch(
    runtimeSource,
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*[.(]/,
    "the stage 1 local core must not send records over the network",
  );
  assert.doesNotMatch(
    runtimeSource,
    /\b(?:signIn|signOut|logIn|logOut|AuthAdapter|SyncAdapter|CloudStorageAdapter)\b/,
    "stage 1 must not implement login or cloud adapters",
  );
  assert.doesNotMatch(
    runtimeSource,
    /\b(?:AIProvider|OpenAI|Anthropic|chatCompletion|modelKey)\b/i,
    "stage 1 must not implement AI or key handling",
  );
  assert.doesNotMatch(
    `${runtimeSource}\n${dependencyNames}`,
    /\b(?:analytics|posthog|sentry|mixpanel|segment|amplitude|gtag)\b/i,
    "stage 1 must not add telemetry",
  );
  assert.doesNotMatch(
    dependencyNames,
    /\b(?:drizzle|prisma|sequelize|typeorm|firebase|supabase)\b/i,
    "stage 1 must not ship a server database client",
  );
});

test("exposes the stable lib/stage1 local product contract", async () => {
  const expectedModules = [
    "types.ts",
    "db.ts",
    "identity.ts",
    "responses.ts",
    "export.ts",
    "index.ts",
  ];
  for (const moduleName of expectedModules) {
    assert.equal(
      await exists(`lib/stage1/${moduleName}`),
      true,
      `lib/stage1/${moduleName} should exist`,
    );
  }

  const stage1Source = (
    await Promise.all(
      expectedModules.map((moduleName) => read(`lib/stage1/${moduleName}`)),
    )
  ).join("\n");
  const requiredExports = [
    "LocalUserV1",
    "CheckInV1",
    "CreateCheckInInput",
    "LocalExportV1",
    "LocalResponseInput",
    "LocalResponse",
    "Stage1StorageError",
    "createStage1Database",
    "getStage1Database",
    "openStage1Database",
    "saveCheckIn",
    "listCheckIns",
    "getCheckInById",
    "deleteCheckIn",
    "clearStage1Data",
    "ensureLocalIdentity",
    "clearAllLocalDataAndRecreateIdentity",
    "selectLocalResponse",
    "getStateFallbackResponse",
    "createLocalExport",
  ];

  for (const exportName of requiredExports) {
    assert.match(
      stage1Source,
      new RegExp(`\\b${exportName}\\b`),
      `lib/stage1 should expose ${exportName}`,
    );
  }

  assert.match(stage1Source, /local_users/);
  assert.match(stage1Source, /check_ins/);
  assert.match(stage1Source, /\[localUserId\+occurredAt\]/);
  assert.doesNotMatch(stage1Source, /Math\.random\s*\(/);

  const [typesSource, databaseSource] = await Promise.all([
    read("lib/stage1/types.ts"),
    read("lib/stage1/db.ts"),
  ]);
  const checkInV1Contract =
    typesSource.match(/export type CheckInV1\s*=\s*\{[\s\S]*?\n\};/)?.[0] ?? "";
  const stage1Stores =
    databaseSource.match(/const STAGE1_STORES\s*=\s*\{[\s\S]*?\}\s*as const;/)?.[0] ?? "";
  assert.ok(checkInV1Contract, "the CheckInV1 contract must remain explicit");
  assert.ok(stage1Stores, "the v1 database store declaration must remain explicit");
  assert.doesNotMatch(
    checkInV1Contract,
    /\b(?:photo|attachment|account|sync|modelKey|calorie)\w*\s*[?:]/i,
    "the v1 local contract must not prebuild later-stage data fields",
  );
  assert.doesNotMatch(
    stage1Stores,
    /["'](?:photos|attachments|accounts|sync|models|preferences)["']/i,
    "the v1 database must contain only the local identity and check-in tables",
  );
});
