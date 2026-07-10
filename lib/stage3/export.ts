import {
  ensureLocalIdentity,
  getStage1Database,
  listAttachments,
  listCheckIns,
  LOCAL_EXPORT_PRODUCT,
  LOCAL_EXPORT_VERSION_3,
  type LocalExportV3,
  type Stage1Database,
  STAGE3_SCHEMA_VERSION,
  toLocalImageAttachmentMetadata,
  toStage1StorageError,
} from "../stage1";
import { listActivities } from "./storage";

export async function createLocalExportV3(
  database: Stage1Database = getStage1Database(),
  now: Date = new Date(),
): Promise<LocalExportV3> {
  try {
    const localUser = await ensureLocalIdentity(database);
    const [checkIns, localAttachments, activities] = await Promise.all([
      listCheckIns(localUser.id, database),
      listAttachments(localUser.id, database),
      listActivities(localUser.id, database),
    ]);
    const attachments = localAttachments.map(toLocalImageAttachmentMetadata);

    return {
      product: LOCAL_EXPORT_PRODUCT,
      exportVersion: LOCAL_EXPORT_VERSION_3,
      schemaVersion: STAGE3_SCHEMA_VERSION,
      exportedAt: now.toISOString(),
      localUser: { id: localUser.id, createdAt: localUser.createdAt },
      checkIns,
      attachments,
      activities,
    };
  } catch (error) {
    throw toStage1StorageError("createLocalExportV3", error);
  }
}

export async function createLocalExportJsonV3(
  database: Stage1Database = getStage1Database(),
  now: Date = new Date(),
): Promise<string> {
  return JSON.stringify(await createLocalExportV3(database, now), null, 2);
}
