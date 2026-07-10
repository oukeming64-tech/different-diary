export const STAGE1_SCHEMA_VERSION = 1 as const;
export const LOCAL_EXPORT_VERSION = 1 as const;
export const LOCAL_EXPORT_PRODUCT = "减肥拍拍乐" as const;

export const CHECK_IN_STATES = ["food", "rest", "tired", "visit"] as const;

export type CheckInState = (typeof CHECK_IN_STATES)[number];

export type LocalUserV1 = {
  id: string;
  createdAt: string;
  schemaVersion: typeof STAGE1_SCHEMA_VERSION;
};

export type CheckInV1 = {
  id: string;
  localUserId: string;
  occurredAt: string;
  state: CheckInState;
  intentId: string;
  userText: string | null;
  responseKey: string;
  responseText: string;
  helpful: boolean | null;
};

export type CreateCheckInInput = {
  localUserId: string;
  state: CheckInState;
  intentId: string;
  userText?: string | null;
  responseKey: string;
  responseText: string;
  helpful?: boolean | null;
  occurredAt?: string;
};

export type LocalResponseInput = {
  state: CheckInState;
  intentId: string;
  recentResponseKeys: string[];
};

export type LocalResponse = {
  key: string;
  text: string;
};

export type LocalExportV1 = {
  product: typeof LOCAL_EXPORT_PRODUCT;
  exportVersion: typeof LOCAL_EXPORT_VERSION;
  schemaVersion: typeof STAGE1_SCHEMA_VERSION;
  exportedAt: string;
  localUser: Pick<LocalUserV1, "id" | "createdAt">;
  checkIns: CheckInV1[];
};

export type Stage1ErrorCode =
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_OPERATION_FAILED"
  | "INVALID_INPUT"
  | "UUID_UNAVAILABLE";

export class Stage1StorageError extends Error {
  readonly code: Stage1ErrorCode;
  readonly operation: string;

  constructor(
    code: Stage1ErrorCode,
    operation: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "Stage1StorageError";
    this.code = code;
    this.operation = operation;
  }
}

export function isStage1StorageError(
  error: unknown,
): error is Stage1StorageError {
  return error instanceof Stage1StorageError;
}

export function toStage1StorageError(
  operation: string,
  error: unknown,
): Stage1StorageError {
  if (isStage1StorageError(error)) {
    return error;
  }

  return new Stage1StorageError(
    "STORAGE_OPERATION_FAILED",
    operation,
    `本机数据操作失败：${operation}`,
    { cause: error },
  );
}

