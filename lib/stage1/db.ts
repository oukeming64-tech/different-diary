import Dexie, { type DexieOptions, type Table } from "dexie";

import {
  type ActivityRecordV1,
  CHECK_IN_STATES,
  type CheckInV1,
  type CreateCheckInInput,
  type CreateLocalImageAttachmentInput,
  type CreatePhotoCheckInInput,
  CURRENT_LOCAL_SCHEMA_VERSION,
  LOCAL_IMAGE_MIME_TYPES,
  type LocalImageAttachmentV1,
  type LocalUserV1,
  type SavedPhotoCheckIn,
  Stage1StorageError,
  STAGE1_SCHEMA_VERSION,
  STAGE2_SCHEMA_VERSION,
  STAGE3_SCHEMA_VERSION,
  toStage1StorageError,
} from "./types";
import { createStableUuid } from "./uuid";

export const STAGE1_DATABASE_NAME = "jianfei-paipai-le-stage1";

const STAGE1_STORES = {
  local_users: "&id, createdAt, schemaVersion",
  check_ins:
    "&id, localUserId, occurredAt, [localUserId+occurredAt], state, responseKey",
} as const;

const STAGE2_STORES = {
  ...STAGE1_STORES,
  attachments:
    "&id, checkInId, localUserId, createdAt, [localUserId+createdAt]",
} as const;

const STAGE3_STORES = {
  ...STAGE2_STORES,
  activity_records:
    "&id, checkInId, localUserId, createdAt, [localUserId+createdAt], category",
} as const;

export type CreateStage1DatabaseOptions = {
  name?: string;
  indexedDB?: DexieOptions["indexedDB"];
  IDBKeyRange?: DexieOptions["IDBKeyRange"];
};

export class Stage1Database extends Dexie {
  readonly localUsers: Table<LocalUserV1, string>;
  readonly checkIns: Table<CheckInV1, string>;
  readonly attachments: Table<LocalImageAttachmentV1, string>;
  readonly activities: Table<ActivityRecordV1, string>;

  constructor(name: string, options: DexieOptions) {
    super(name, options);
    this.version(STAGE1_SCHEMA_VERSION).stores(STAGE1_STORES);
    this.version(STAGE2_SCHEMA_VERSION)
      .stores(STAGE2_STORES)
      .upgrade(async (transaction) => {
        await transaction
          .table<LocalUserV1>("local_users")
          .toCollection()
          .modify({ schemaVersion: CURRENT_LOCAL_SCHEMA_VERSION });
      });
    this.version(STAGE3_SCHEMA_VERSION)
      .stores(STAGE3_STORES)
      .upgrade(async (transaction) => {
        await transaction
          .table<LocalUserV1>("local_users")
          .toCollection()
          .modify({ schemaVersion: CURRENT_LOCAL_SCHEMA_VERSION });
      });
    this.localUsers = this.table<LocalUserV1, string>("local_users");
    this.checkIns = this.table<CheckInV1, string>("check_ins");
    this.attachments = this.table<LocalImageAttachmentV1, string>("attachments");
    this.activities = this.table<ActivityRecordV1, string>("activity_records");
  }
}

let defaultDatabase: Stage1Database | undefined;

function readBrowserStorageDependencies(): Pick<
  Required<CreateStage1DatabaseOptions>,
  "indexedDB" | "IDBKeyRange"
> {
  if (
    typeof globalThis.indexedDB === "undefined" ||
    typeof globalThis.IDBKeyRange === "undefined"
  ) {
    throw new Stage1StorageError(
      "STORAGE_UNAVAILABLE",
      "createStage1Database",
      "当前环境不支持本机记录存储。",
    );
  }

  return {
    indexedDB: globalThis.indexedDB,
    IDBKeyRange: globalThis.IDBKeyRange,
  };
}

export function createStage1Database(
  options: CreateStage1DatabaseOptions = {},
): Stage1Database {
  const browserDependencies =
    options.indexedDB && options.IDBKeyRange
      ? { indexedDB: options.indexedDB, IDBKeyRange: options.IDBKeyRange }
      : readBrowserStorageDependencies();

  return new Stage1Database(options.name ?? STAGE1_DATABASE_NAME, {
    indexedDB: options.indexedDB ?? browserDependencies.indexedDB,
    IDBKeyRange: options.IDBKeyRange ?? browserDependencies.IDBKeyRange,
  });
}

export function getStage1Database(): Stage1Database {
  defaultDatabase ??= createStage1Database();
  return defaultDatabase;
}

export async function openStage1Database(
  database: Stage1Database = getStage1Database(),
): Promise<Stage1Database> {
  try {
    await database.open();
    return database;
  } catch (error) {
    throw toStage1StorageError("openStage1Database", error);
  }
}

function assertCreateCheckInInput(
  input: CreateCheckInInput,
  operation = "saveCheckIn",
): void {
  const requiredStrings = [
    input.localUserId,
    input.intentId,
    input.responseKey,
    input.responseText,
  ];

  if (
    requiredStrings.some((value) => typeof value !== "string" || !value.trim()) ||
    !CHECK_IN_STATES.includes(input.state) ||
    (input.occurredAt !== undefined &&
      Number.isNaN(Date.parse(input.occurredAt)))
  ) {
    throw new Stage1StorageError(
      "INVALID_INPUT",
      operation,
      "记录内容缺少必要字段或时间格式无效。",
    );
  }
}

function makeCheckIn(input: CreateCheckInInput): CheckInV1 {
  return {
    id: createStableUuid(),
    localUserId: input.localUserId,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    state: input.state,
    intentId: input.intentId,
    userText: input.userText ?? null,
    responseKey: input.responseKey,
    responseText: input.responseText,
    helpful: input.helpful ?? null,
  };
}

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function assertProcessedImageInput(
  image: CreateLocalImageAttachmentInput,
): void {
  if (
    !(image.blob instanceof Blob) ||
    !(image.thumbnailBlob instanceof Blob) ||
    image.blob.size === 0 ||
    image.thumbnailBlob.size === 0 ||
    !LOCAL_IMAGE_MIME_TYPES.includes(image.mimeType) ||
    !LOCAL_IMAGE_MIME_TYPES.includes(image.thumbnailMimeType) ||
    !isPositiveInteger(image.width) ||
    !isPositiveInteger(image.height) ||
    !isPositiveInteger(image.thumbnailWidth) ||
    !isPositiveInteger(image.thumbnailHeight)
  ) {
    throw new Stage1StorageError(
      "INVALID_INPUT",
      "savePhotoCheckIn",
      "本机图片尚未完成有效的压缩处理。",
    );
  }
}

async function assertLocalUserExists(
  localUserId: string,
  database: Stage1Database,
  operation: string,
): Promise<void> {
  const localUser = await database.localUsers.get(localUserId);
  if (!localUser) {
    throw new Stage1StorageError(
      "INVALID_INPUT",
      operation,
      "找不到这条记录对应的本机身份。",
    );
  }
}

export async function saveCheckIn(
  input: CreateCheckInInput,
  database: Stage1Database = getStage1Database(),
): Promise<CheckInV1> {
  assertCreateCheckInInput(input);
  const checkIn = makeCheckIn(input);

  try {
    return await database.transaction(
      "rw",
      database.localUsers,
      database.checkIns,
      async () => {
        await assertLocalUserExists(
          input.localUserId,
          database,
          "saveCheckIn",
        );
        await database.checkIns.add(checkIn);
        return checkIn;
      },
    );
  } catch (error) {
    throw toStage1StorageError("saveCheckIn", error);
  }
}

export async function savePhotoCheckIn(
  input: CreatePhotoCheckInInput,
  database: Stage1Database = getStage1Database(),
): Promise<SavedPhotoCheckIn> {
  assertCreateCheckInInput(input, "savePhotoCheckIn");
  assertProcessedImageInput(input.image);

  const checkIn = makeCheckIn(input);
  const attachment: LocalImageAttachmentV1 = {
    id: createStableUuid(),
    localUserId: checkIn.localUserId,
    checkInId: checkIn.id,
    createdAt: checkIn.occurredAt,
    mediaType: "image",
    mimeType: input.image.mimeType,
    blob: input.image.blob,
    byteSize: input.image.blob.size,
    width: input.image.width,
    height: input.image.height,
    thumbnailBlob: input.image.thumbnailBlob,
    thumbnailMimeType: input.image.thumbnailMimeType,
    thumbnailByteSize: input.image.thumbnailBlob.size,
    thumbnailWidth: input.image.thumbnailWidth,
    thumbnailHeight: input.image.thumbnailHeight,
    processingVersion: 1,
  };

  try {
    return await database.transaction(
      "rw",
      database.localUsers,
      database.checkIns,
      database.attachments,
      async () => {
        await assertLocalUserExists(
          input.localUserId,
          database,
          "savePhotoCheckIn",
        );
        await database.checkIns.add(checkIn);
        await database.attachments.add(attachment);
        return { checkIn, attachment };
      },
    );
  } catch (error) {
    throw toStage1StorageError("savePhotoCheckIn", error);
  }
}

export async function listCheckIns(
  localUserId: string,
  database: Stage1Database = getStage1Database(),
): Promise<CheckInV1[]> {
  try {
    const records = await database.checkIns
      .where("[localUserId+occurredAt]")
      .between(
        [localUserId, Dexie.minKey],
        [localUserId, Dexie.maxKey],
        true,
        true,
      )
      .toArray();

    return records.sort(
      (left, right) =>
        right.occurredAt.localeCompare(left.occurredAt) ||
        right.id.localeCompare(left.id),
    );
  } catch (error) {
    throw toStage1StorageError("listCheckIns", error);
  }
}

export async function getCheckInById(
  id: string,
  database: Stage1Database = getStage1Database(),
): Promise<CheckInV1 | undefined> {
  try {
    return await database.checkIns.get(id);
  } catch (error) {
    throw toStage1StorageError("getCheckInById", error);
  }
}

export async function listAttachments(
  localUserId: string,
  database: Stage1Database = getStage1Database(),
): Promise<LocalImageAttachmentV1[]> {
  try {
    const attachments = await database.attachments
      .where("[localUserId+createdAt]")
      .between(
        [localUserId, Dexie.minKey],
        [localUserId, Dexie.maxKey],
        true,
        true,
      )
      .toArray();

    return attachments.sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        right.id.localeCompare(left.id),
    );
  } catch (error) {
    throw toStage1StorageError("listAttachments", error);
  }
}

export async function listAttachmentsForCheckIn(
  checkInId: string,
  database: Stage1Database = getStage1Database(),
): Promise<LocalImageAttachmentV1[]> {
  try {
    const attachments = await database.attachments
      .where("checkInId")
      .equals(checkInId)
      .toArray();
    return attachments.sort(
      (left, right) =>
        left.createdAt.localeCompare(right.createdAt) ||
        left.id.localeCompare(right.id),
    );
  } catch (error) {
    throw toStage1StorageError("listAttachmentsForCheckIn", error);
  }
}

export async function getAttachmentById(
  id: string,
  database: Stage1Database = getStage1Database(),
): Promise<LocalImageAttachmentV1 | undefined> {
  try {
    return await database.attachments.get(id);
  } catch (error) {
    throw toStage1StorageError("getAttachmentById", error);
  }
}

export async function deleteCheckIn(
  id: string,
  database: Stage1Database = getStage1Database(),
): Promise<boolean> {
  try {
    return await database.transaction(
      "rw",
      database.checkIns,
      database.attachments,
      database.activities,
      async () => {
        const record = await database.checkIns.get(id);
        if (!record) {
          return false;
        }
        await database.attachments.where("checkInId").equals(id).delete();
        await database.activities.where("checkInId").equals(id).delete();
        await database.checkIns.delete(id);
        return true;
      },
    );
  } catch (error) {
    throw toStage1StorageError("deleteCheckIn", error);
  }
}

export async function clearStage1Data(
  database: Stage1Database = getStage1Database(),
): Promise<void> {
  try {
    await database.transaction(
      "rw",
      database.attachments,
      database.activities,
      database.checkIns,
      database.localUsers,
      async () => {
        await database.attachments.clear();
        await database.activities.clear();
        await database.checkIns.clear();
        await database.localUsers.clear();
      },
    );
  } catch (error) {
    throw toStage1StorageError("clearStage1Data", error);
  }
}
