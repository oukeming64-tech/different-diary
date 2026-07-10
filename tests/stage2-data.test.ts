import assert from "node:assert/strict";
import test from "node:test";

import Dexie from "dexie";
import { IDBKeyRange, indexedDB } from "fake-indexeddb";

import {
  clearAllLocalDataAndRecreateIdentity,
  clearStage1Data,
  createLocalExportJsonV2,
  createLocalExportV2,
  createStage1Database,
  CURRENT_LOCAL_SCHEMA_VERSION,
  deleteCheckIn,
  ensureLocalIdentity,
  getAttachmentById,
  getCheckInById,
  listAttachments,
  listAttachmentsForCheckIn,
  savePhotoCheckIn,
  Stage1StorageError,
  type CheckInV1,
  type CreateLocalImageAttachmentInput,
  type LocalUserV1,
} from "../lib/stage1/index";

let databaseSequence = 0;

function nextDatabaseName(label: string): string {
  databaseSequence += 1;
  return `stage2-${label}-${databaseSequence}`;
}

function makeDatabase(label: string) {
  return createStage1Database({
    name: nextDatabaseName(label),
    indexedDB,
    IDBKeyRange,
  });
}

function makeProcessedImage(
  content = "processed-image",
): CreateLocalImageAttachmentInput {
  return {
    mimeType: "image/jpeg",
    blob: new Blob([content], { type: "image/jpeg" }),
    width: 1280,
    height: 960,
    thumbnailBlob: new Blob([`thumb:${content}`], { type: "image/webp" }),
    thumbnailMimeType: "image/webp",
    thumbnailWidth: 320,
    thumbnailHeight: 240,
  };
}

async function destroyDatabase(database: Dexie): Promise<void> {
  database.close();
  await database.delete();
}

test("upgrades the existing v1 database in place without losing check-ins", async () => {
  const name = nextDatabaseName("migration");
  const legacy = new Dexie(name, { indexedDB, IDBKeyRange });
  legacy.version(1).stores({
    local_users: "&id, createdAt, schemaVersion",
    check_ins:
      "&id, localUserId, occurredAt, [localUserId+occurredAt], state, responseKey",
  });

  const legacyUser: LocalUserV1 = {
    id: "legacy-user",
    createdAt: "2026-07-09T08:00:00.000Z",
    schemaVersion: 1,
  };
  const legacyCheckIn: CheckInV1 = {
    id: "legacy-check-in",
    localUserId: legacyUser.id,
    occurredAt: "2026-07-09T09:00:00.000Z",
    state: "rest",
    intentId: "full-rest",
    userText: null,
    responseKey: "rest.full-rest.1",
    responseText: "好，今天就休息。",
    helpful: null,
  };

  await legacy.open();
  await legacy.table<LocalUserV1>("local_users").add(legacyUser);
  await legacy.table<CheckInV1>("check_ins").add(legacyCheckIn);
  legacy.close();

  const upgraded = createStage1Database({ name, indexedDB, IDBKeyRange });
  try {
    await upgraded.open();

    assert.equal(upgraded.verno, 2);
    assert.deepEqual(await upgraded.checkIns.get(legacyCheckIn.id), legacyCheckIn);
    assert.equal(
      (await upgraded.localUsers.get(legacyUser.id))?.schemaVersion,
      CURRENT_LOCAL_SCHEMA_VERSION,
    );
    assert.equal(await upgraded.attachments.count(), 0);
  } finally {
    await destroyDatabase(upgraded);
  }
});

test("atomically saves a processed photo check-in and reads its Blob", async () => {
  const database = makeDatabase("atomic-save");
  try {
    const identity = await ensureLocalIdentity(database);
    const saved = await savePhotoCheckIn(
      {
        localUserId: identity.id,
        state: "food",
        intentId: "photo-no-calories",
        occurredAt: "2026-07-10T08:00:00.000Z",
        responseKey: "food.photo-no-calories.1",
        responseText: "可以，只把它当作今天的一小段生活。",
        image: makeProcessedImage(),
      },
      database,
    );

    assert.equal(saved.attachment.checkInId, saved.checkIn.id);
    assert.equal(saved.attachment.localUserId, identity.id);
    assert.equal(saved.attachment.byteSize, saved.attachment.blob.size);
    assert.equal(
      saved.attachment.thumbnailByteSize,
      saved.attachment.thumbnailBlob.size,
    );
    assert.equal(await saved.attachment.blob.text(), "processed-image");

    const [byUser] = await listAttachments(identity.id, database);
    const [byCheckIn] = await listAttachmentsForCheckIn(
      saved.checkIn.id,
      database,
    );
    const byId = await getAttachmentById(saved.attachment.id, database);
    assert.equal(byUser.id, saved.attachment.id);
    assert.equal(byCheckIn.id, saved.attachment.id);
    assert.equal(byId?.id, saved.attachment.id);
    assert.equal(await byId?.thumbnailBlob.text(), "thumb:processed-image");

    const checkInCount = await database.checkIns.count();
    const attachmentCount = await database.attachments.count();
    await assert.rejects(
      savePhotoCheckIn(
        {
          localUserId: "missing-user",
          state: "food",
          intentId: "photo-no-calories",
          responseKey: "food.photo-no-calories.1",
          responseText: "只记录。",
          image: makeProcessedImage("must-not-save"),
        },
        database,
      ),
      (error: unknown) =>
        error instanceof Stage1StorageError && error.code === "INVALID_INPUT",
    );
    assert.equal(await database.checkIns.count(), checkInCount);
    assert.equal(await database.attachments.count(), attachmentCount);
  } finally {
    await destroyDatabase(database);
  }
});

test("cascades attachment deletion when its check-in is deleted", async () => {
  const database = makeDatabase("cascade");
  try {
    const identity = await ensureLocalIdentity(database);
    const saved = await savePhotoCheckIn(
      {
        localUserId: identity.id,
        state: "visit",
        intentId: "quiet",
        responseKey: "visit.quiet.1",
        responseText: "好。这里没有倒计时。",
        image: makeProcessedImage("cascade"),
      },
      database,
    );

    assert.equal(await deleteCheckIn(saved.checkIn.id, database), true);
    assert.equal(await getCheckInById(saved.checkIn.id, database), undefined);
    assert.equal(await getAttachmentById(saved.attachment.id, database), undefined);
  } finally {
    await destroyDatabase(database);
  }
});

test("clears attachments in both local reset paths", async () => {
  const resetDatabase = makeDatabase("clear-and-rebuild");
  try {
    const identity = await ensureLocalIdentity(resetDatabase);
    await savePhotoCheckIn(
      {
        localUserId: identity.id,
        state: "tired",
        intentId: "rest",
        responseKey: "tired.rest.1",
        responseText: "那就休息。",
        image: makeProcessedImage("reset"),
      },
      resetDatabase,
    );

    const replacement = await clearAllLocalDataAndRecreateIdentity(resetDatabase);
    assert.notEqual(replacement.id, identity.id);
    assert.equal(replacement.schemaVersion, CURRENT_LOCAL_SCHEMA_VERSION);
    assert.equal(await resetDatabase.attachments.count(), 0);
    assert.equal(await resetDatabase.checkIns.count(), 0);
  } finally {
    await destroyDatabase(resetDatabase);
  }

  const clearDatabase = makeDatabase("raw-clear");
  try {
    const identity = await ensureLocalIdentity(clearDatabase);
    await savePhotoCheckIn(
      {
        localUserId: identity.id,
        state: "visit",
        intentId: "quiet",
        responseKey: "visit.quiet.1",
        responseText: "安静待一会儿。",
        image: makeProcessedImage("raw-clear"),
      },
      clearDatabase,
    );

    await clearStage1Data(clearDatabase);
    assert.equal(await clearDatabase.attachments.count(), 0);
    assert.equal(await clearDatabase.checkIns.count(), 0);
    assert.equal(await clearDatabase.localUsers.count(), 0);
  } finally {
    await destroyDatabase(clearDatabase);
  }
});

test("exports attachment metadata without embedding image binaries", async () => {
  const database = makeDatabase("export");
  try {
    const identity = await ensureLocalIdentity(database);
    const saved = await savePhotoCheckIn(
      {
        localUserId: identity.id,
        state: "food",
        intentId: "photo-no-calories",
        responseKey: "food.photo-no-calories.1",
        responseText: "这里只替你记住。",
        image: makeProcessedImage("export"),
      },
      database,
    );

    const exported = await createLocalExportV2(
      database,
      new Date("2026-07-10T12:00:00.000Z"),
    );
    assert.equal(exported.exportVersion, 2);
    assert.equal(exported.schemaVersion, 2);
    assert.equal(exported.attachments.length, 1);
    assert.equal(exported.attachments[0].id, saved.attachment.id);
    assert.equal(exported.attachments[0].byteSize, saved.attachment.blob.size);
    assert.equal(exported.attachments[0].binaryIncluded, false);
    assert.equal("blob" in exported.attachments[0], false);
    assert.equal("thumbnailBlob" in exported.attachments[0], false);

    const json = await createLocalExportJsonV2(database);
    assert.doesNotMatch(json, /"blob"|"thumbnailBlob"/);
    assert.match(json, /"binaryIncluded": false/);
  } finally {
    await destroyDatabase(database);
  }
});

