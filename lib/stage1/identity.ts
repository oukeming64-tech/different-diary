import { getStage1Database, type Stage1Database } from "./db";
import {
  type LocalUserV1,
  CURRENT_LOCAL_SCHEMA_VERSION,
  toStage1StorageError,
} from "./types";
import { createStableUuid } from "./uuid";

function makeLocalIdentity(now: Date = new Date()): LocalUserV1 {
  return {
    id: createStableUuid(),
    createdAt: now.toISOString(),
    schemaVersion: CURRENT_LOCAL_SCHEMA_VERSION,
  };
}

function sortIdentities(identities: LocalUserV1[]): LocalUserV1[] {
  return identities.sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id),
  );
}

export async function ensureLocalIdentity(
  database: Stage1Database = getStage1Database(),
): Promise<LocalUserV1> {
  try {
    return await database.transaction("rw", database.localUsers, async () => {
      const existing = sortIdentities(await database.localUsers.toArray())[0];
      if (existing) {
        return existing;
      }

      const created = makeLocalIdentity();
      await database.localUsers.add(created);
      return created;
    });
  } catch (error) {
    throw toStage1StorageError("ensureLocalIdentity", error);
  }
}

export async function clearAllLocalDataAndRecreateIdentity(
  database: Stage1Database = getStage1Database(),
): Promise<LocalUserV1> {
  try {
    return await database.transaction(
      "rw",
      database.attachments,
      database.checkIns,
      database.localUsers,
      async () => {
        await database.attachments.clear();
        await database.checkIns.clear();
        await database.localUsers.clear();

        const replacement = makeLocalIdentity();
        await database.localUsers.add(replacement);
        return replacement;
      },
    );
  } catch (error) {
    throw toStage1StorageError(
      "clearAllLocalDataAndRecreateIdentity",
      error,
    );
  }
}
