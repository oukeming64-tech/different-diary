import assert from "node:assert/strict";
import test from "node:test";

import Dexie from "dexie";
import { IDBKeyRange, indexedDB } from "fake-indexeddb";

import {
  clearAllLocalDataAndRecreateIdentity,
  createStage1Database,
  deleteCheckIn,
  ensureLocalIdentity,
  getCheckInById,
  openStage1Database,
  STAGE3_SCHEMA_VERSION,
  Stage1StorageError,
} from "../lib/stage1/index";
import {
  createLocalExportV3,
  listActivities,
  recordActivityLocally,
} from "../lib/stage3/index";

let databaseSequence = 0;

function makeDatabase(label: string) {
  databaseSequence += 1;
  return createStage1Database({
    name: `stage3-${label}-${databaseSequence}`,
    indexedDB,
    IDBKeyRange,
  });
}

async function destroyDatabase(database: ReturnType<typeof makeDatabase>) {
  database.close();
  await database.delete();
}

test("upgrades a v2 local space without losing existing records", async () => {
  databaseSequence += 1;
  const name = `stage3-migration-${databaseSequence}`;
  const legacy = new Dexie(name, { indexedDB, IDBKeyRange });
  legacy.version(1).stores({
    local_users: "&id, createdAt, schemaVersion",
    check_ins:
      "&id, localUserId, occurredAt, [localUserId+occurredAt], state, responseKey",
  });
  legacy.version(2).stores({
    local_users: "&id, createdAt, schemaVersion",
    check_ins:
      "&id, localUserId, occurredAt, [localUserId+occurredAt], state, responseKey",
    attachments:
      "&id, checkInId, localUserId, createdAt, [localUserId+createdAt]",
  });
  await legacy.open();
  await legacy.table("local_users").add({
    id: "legacy-user",
    createdAt: "2026-07-10T08:00:00.000Z",
    schemaVersion: 2,
  });
  await legacy.table("check_ins").add({
    id: "legacy-check-in",
    localUserId: "legacy-user",
    occurredAt: "2026-07-10T09:00:00.000Z",
    state: "visit",
    intentId: "quiet",
    userText: null,
    responseKey: "visit.quiet.1",
    responseText: "安静待一会儿。",
    helpful: null,
  });
  legacy.close();

  const database = createStage1Database({ name, indexedDB, IDBKeyRange });
  try {
    await openStage1Database(database);
    const identity = await database.localUsers.get("legacy-user");
    assert.equal(identity?.schemaVersion, STAGE3_SCHEMA_VERSION);
    assert.equal((await getCheckInById("legacy-check-in", database))?.id, "legacy-check-in");
    assert.equal(await database.activities.count(), 0);
  } finally {
    await destroyDatabase(database);
  }
});

test("saves, lists and exports a local movement record", async () => {
  const database = makeDatabase("round-trip");
  try {
    const identity = await ensureLocalIdentity(database);
    const saved = await recordActivityLocally(
      {
        localUserId: identity.id,
        category: "walking",
        durationMinutes: 35,
        steps: 4_260,
        distanceKm: 3.2,
        note: "下班后随便走了一圈",
        occurredAt: "2026-07-10T12:00:00.000Z",
      },
      database,
    );

    assert.equal(saved.checkIn.state, "tired");
    assert.equal(saved.checkIn.intentId, "activity-record");
    assert.equal(saved.activity.checkInId, saved.checkIn.id);
    assert.equal(saved.activity.steps, 4_260);
    assert.equal((await listActivities(identity.id, database))[0].id, saved.activity.id);

    const exported = await createLocalExportV3(
      database,
      new Date("2026-07-10T13:00:00.000Z"),
    );
    assert.equal(exported.exportVersion, 3);
    assert.equal(exported.schemaVersion, 3);
    assert.equal(exported.activities[0].note, "下班后随便走了一圈");
    assert.equal(exported.checkIns[0].id, saved.checkIn.id);
  } finally {
    await destroyDatabase(database);
  }
});

test("allows a detail-free record and rejects invalid numbers atomically", async () => {
  const database = makeDatabase("validation");
  try {
    const identity = await ensureLocalIdentity(database);
    const minimal = await recordActivityLocally(
      { localUserId: identity.id },
      database,
    );
    assert.equal(minimal.activity.category, "unspecified");
    assert.equal(minimal.activity.durationMinutes, null);
    assert.equal(minimal.activity.steps, null);
    assert.equal(minimal.activity.distanceKm, null);

    const checkInCount = await database.checkIns.count();
    const activityCount = await database.activities.count();
    await assert.rejects(
      recordActivityLocally(
        { localUserId: identity.id, durationMinutes: -5 },
        database,
      ),
      (error: unknown) =>
        error instanceof Stage1StorageError && error.code === "INVALID_INPUT",
    );
    assert.equal(await database.checkIns.count(), checkInCount);
    assert.equal(await database.activities.count(), activityCount);
  } finally {
    await destroyDatabase(database);
  }
});

test("cascades deletion and includes movement data in the full local reset", async () => {
  const database = makeDatabase("delete-clear");
  try {
    const identity = await ensureLocalIdentity(database);
    const first = await recordActivityLocally(
      { localUserId: identity.id, category: "cycling" },
      database,
    );
    assert.equal(await deleteCheckIn(first.checkIn.id, database), true);
    assert.equal(await database.activities.get(first.activity.id), undefined);

    await recordActivityLocally(
      { localUserId: identity.id, category: "stretching" },
      database,
    );
    const replacement = await clearAllLocalDataAndRecreateIdentity(database);
    assert.notEqual(replacement.id, identity.id);
    assert.equal(await database.activities.count(), 0);
    assert.equal(await database.checkIns.count(), 0);
  } finally {
    await destroyDatabase(database);
  }
});
