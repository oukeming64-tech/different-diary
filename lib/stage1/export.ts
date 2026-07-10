import {
  getStage1Database,
  listAttachments,
  listCheckIns,
  type Stage1Database,
} from "./db";
import { ensureLocalIdentity } from "./identity";
import {
  LOCAL_EXPORT_PRODUCT,
  LOCAL_EXPORT_VERSION,
  LOCAL_EXPORT_VERSION_2,
  type LocalExportV2,
  type LocalImageAttachmentMetadataV1,
  type LocalExportV1,
  STAGE1_SCHEMA_VERSION,
  STAGE2_SCHEMA_VERSION,
  toStage1StorageError,
} from "./types";

export function toLocalImageAttachmentMetadata(
  attachment: Awaited<ReturnType<typeof listAttachments>>[number],
): LocalImageAttachmentMetadataV1 {
  return {
    id: attachment.id,
    localUserId: attachment.localUserId,
    checkInId: attachment.checkInId,
    createdAt: attachment.createdAt,
    mediaType: attachment.mediaType,
    mimeType: attachment.mimeType,
    byteSize: attachment.byteSize,
    width: attachment.width,
    height: attachment.height,
    thumbnailMimeType: attachment.thumbnailMimeType,
    thumbnailByteSize: attachment.thumbnailByteSize,
    thumbnailWidth: attachment.thumbnailWidth,
    thumbnailHeight: attachment.thumbnailHeight,
    processingVersion: attachment.processingVersion,
    binaryIncluded: false,
  };
}

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

export async function createLocalExportV2(
  database: Stage1Database = getStage1Database(),
  now: Date = new Date(),
): Promise<LocalExportV2> {
  try {
    const localUser = await ensureLocalIdentity(database);
    const [checkIns, localAttachments] = await Promise.all([
      listCheckIns(localUser.id, database),
      listAttachments(localUser.id, database),
    ]);
    const attachments: LocalImageAttachmentMetadataV1[] = localAttachments.map(
      toLocalImageAttachmentMetadata,
    );

    return {
      product: LOCAL_EXPORT_PRODUCT,
      exportVersion: LOCAL_EXPORT_VERSION_2,
      schemaVersion: STAGE2_SCHEMA_VERSION,
      exportedAt: now.toISOString(),
      localUser: {
        id: localUser.id,
        createdAt: localUser.createdAt,
      },
      checkIns,
      attachments,
    };
  } catch (error) {
    throw toStage1StorageError("createLocalExportV2", error);
  }
}

export async function createLocalExportJsonV2(
  database: Stage1Database = getStage1Database(),
  now: Date = new Date(),
): Promise<string> {
  const payload = await createLocalExportV2(database, now);
  return JSON.stringify(payload, null, 2);
}
