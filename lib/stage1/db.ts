import Dexie, { type DexieOptions, type Table } from "dexie";

import {
  CHECK_IN_STATES,
  type CheckInV1,
  type CreateCheckInInput,
  type LocalUserV1,
  Stage1StorageError,
  STAGE1_SCHEMA_VERSION,
  toStage1StorageError,
} from "./types";
import { createStableUuid } from "./uuid";

export const STAGE1_DATABASE_NAME = "jianfei-paipai-le-stage1";

const STAGE1_STORES = {
  local_users: "&id, createdAt, schemaVersion",
  check_ins:
    "&id, localUserId, occurredAt, [localUserId+occurredAt], state, responseKey",
} as const;

export type CreateStage1DatabaseOptions = {
  name?: string;
  indexedDB?: DexieOptions["indexedDB"];
  IDBKeyRange?: DexieOptions["IDBKeyRange"];
};

export class Stage1Database extends Dexie {
  readonly localUsers: Table<LocalUserV1, string>;
  readonly checkIns: Table<CheckInV1, string>;

  constructor(name: string, options: DexieOptions) {
    super(name, options);
    this.version(STAGE1_SCHEMA_VERSION).stores(STAGE1_STORES);
    this.localUsers = this.table<LocalUserV1, string>("local_users");
    this.checkIns = this.table<CheckInV1, string>("check_ins");
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

function assertCreateCheckInInput(input: CreateCheckInInput): void {
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
      "saveCheckIn",
      "记录内容缺少必要字段或时间格式无效。",
    );
  }
}

export async function saveCheckIn(
  input: CreateCheckInInput,
  database: Stage1Database = getStage1Database(),
): Promise<CheckInV1> {
  assertCreateCheckInInput(input);

  const checkIn: CheckInV1 = {
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

  try {
    return await database.transaction(
      "rw",
      database.localUsers,
      database.checkIns,
      async () => {
        const localUser = await database.localUsers.get(input.localUserId);
        if (!localUser) {
          throw new Stage1StorageError(
            "INVALID_INPUT",
            "saveCheckIn",
            "找不到这条记录对应的本机身份。",
          );
        }
        await database.checkIns.add(checkIn);
        return checkIn;
      },
    );
  } catch (error) {
    throw toStage1StorageError("saveCheckIn", error);
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

export async function deleteCheckIn(
  id: string,
  database: Stage1Database = getStage1Database(),
): Promise<boolean> {
  try {
    return await database.transaction("rw", database.checkIns, async () => {
      const record = await database.checkIns.get(id);
      if (!record) {
        return false;
      }
      await database.checkIns.delete(id);
      return true;
    });
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
      database.checkIns,
      database.localUsers,
      async () => {
        await database.checkIns.clear();
        await database.localUsers.clear();
      },
    );
  } catch (error) {
    throw toStage1StorageError("clearStage1Data", error);
  }
}
