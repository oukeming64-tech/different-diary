import assert from "node:assert/strict";
import test from "node:test";

import { IDBKeyRange, indexedDB } from "fake-indexeddb";

import {
  clearAllLocalDataAndRecreateIdentity,
  createLocalExport,
  createStage1Database,
  deleteCheckIn,
  ensureLocalIdentity,
  getCheckInById,
  listCheckIns,
  saveCheckIn,
  selectLocalResponse,
  Stage1StorageError,
} from "../lib/stage1/index";

let databaseSequence = 0;

function makeDatabase() {
  databaseSequence += 1;
  return createStage1Database({
    name: `stage1-test-${databaseSequence}`,
    indexedDB,
    IDBKeyRange,
  });
}

test("keeps one stable local identity across repeated starts", async () => {
  const database = makeDatabase();
  try {
    const first = await ensureLocalIdentity(database);
    const second = await ensureLocalIdentity(database);

    assert.equal(second.id, first.id);
    assert.equal(second.createdAt, first.createdAt);
    assert.equal((await database.localUsers.count()), 1);
  } finally {
    database.close();
    await database.delete();
  }
});

test("rotates curated local responses without repeating the recent three", () => {
  const keys: string[] = [];

  for (let index = 0; index < 4; index += 1) {
    const response = selectLocalResponse({
      state: "food",
      intentId: "permission",
      recentResponseKeys: [...keys].reverse(),
    });
    keys.push(response.key);
  }

  assert.equal(new Set(keys).size, 4);

  const wrapped = selectLocalResponse({
    state: "food",
    intentId: "permission",
    recentResponseKeys: [...keys].reverse(),
  });
  assert.equal(wrapped.key, keys[0]);

  const fallback = selectLocalResponse({
    state: "visit",
    intentId: "unknown-intent",
    recentResponseKeys: [],
  });
  assert.equal(fallback.key, "visit.fallback");
});

test("saves, lists, reads, exports, deletes and clears local records", async () => {
  const database = makeDatabase();
  try {
    const identity = await ensureLocalIdentity(database);
    const older = await saveCheckIn(
      {
        localUserId: identity.id,
        state: "rest",
        intentId: "full-rest",
        occurredAt: "2026-07-09T12:00:00.000Z",
        responseKey: "rest.full-rest.1",
        responseText: "好，今天就休息。",
      },
      database,
    );
    const newer = await saveCheckIn(
      {
        localUserId: identity.id,
        state: "visit",
        intentId: "quiet",
        occurredAt: "2026-07-10T12:00:00.000Z",
        userText: "只是想安静一下",
        responseKey: "visit.quiet.1",
        responseText: "好。这里没有倒计时，也没有催促。",
      },
      database,
    );

    assert.deepEqual(
      (await listCheckIns(identity.id, database)).map((record) => record.id),
      [newer.id, older.id],
    );
    assert.equal((await getCheckInById(newer.id, database))?.userText, "只是想安静一下");

    const exported = await createLocalExport(
      database,
      new Date("2026-07-10T13:00:00.000Z"),
    );
    assert.equal(exported.localUser.id, identity.id);
    assert.equal(exported.exportVersion, 1);
    assert.equal(exported.checkIns.length, 2);

    assert.equal(await deleteCheckIn(older.id, database), true);
    assert.equal(await getCheckInById(older.id, database), undefined);

    const replacement = await clearAllLocalDataAndRecreateIdentity(database);
    assert.notEqual(replacement.id, identity.id);
    assert.equal((await listCheckIns(replacement.id, database)).length, 0);
    assert.equal(await database.localUsers.get(identity.id), undefined);
  } finally {
    database.close();
    await database.delete();
  }
});

test("reports a recognizable error when IndexedDB is unavailable", () => {
  const originalIndexedDb = globalThis.indexedDB;
  const originalKeyRange = globalThis.IDBKeyRange;
  Reflect.deleteProperty(globalThis, "indexedDB");
  Reflect.deleteProperty(globalThis, "IDBKeyRange");

  try {
    assert.throws(
      () => createStage1Database({ name: "unavailable" }),
      (error: unknown) =>
        error instanceof Stage1StorageError &&
        error.code === "STORAGE_UNAVAILABLE",
    );
  } finally {
    if (originalIndexedDb) globalThis.indexedDB = originalIndexedDb;
    if (originalKeyRange) globalThis.IDBKeyRange = originalKeyRange;
  }
});
