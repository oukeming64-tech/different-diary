import { getStage1Database, listCheckIns, type Stage1Database } from "./db";
import { ensureLocalIdentity } from "./identity";
import {
  LOCAL_EXPORT_PRODUCT,
  LOCAL_EXPORT_VERSION,
  type LocalExportV1,
  STAGE1_SCHEMA_VERSION,
  toStage1StorageError,
} from "./types";

export async function createLocalExport(
  database: Stage1Database = getStage1Database(),
  now: Date = new Date(),
): Promise<LocalExportV1> {
  try {
    const localUser = await ensureLocalIdentity(database);
    const checkIns = await listCheckIns(localUser.id, database);

    return {
      product: LOCAL_EXPORT_PRODUCT,
      exportVersion: LOCAL_EXPORT_VERSION,
      schemaVersion: STAGE1_SCHEMA_VERSION,
      exportedAt: now.toISOString(),
      localUser: {
        id: localUser.id,
        createdAt: localUser.createdAt,
      },
      checkIns,
    };
  } catch (error) {
    throw toStage1StorageError("createLocalExport", error);
  }
}

export async function createLocalExportJson(
  database: Stage1Database = getStage1Database(),
  now: Date = new Date(),
): Promise<string> {
  const payload = await createLocalExport(database, now);
  return JSON.stringify(payload, null, 2);
}

