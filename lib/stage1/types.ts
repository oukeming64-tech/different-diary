export const STAGE1_SCHEMA_VERSION = 1 as const;
export const STAGE2_SCHEMA_VERSION = 2 as const;
export const STAGE3_SCHEMA_VERSION = 3 as const;
export const CURRENT_LOCAL_SCHEMA_VERSION = STAGE3_SCHEMA_VERSION;
export const LOCAL_EXPORT_VERSION = 1 as const;
export const LOCAL_EXPORT_VERSION_2 = 2 as const;
export const LOCAL_EXPORT_VERSION_3 = 3 as const;
export const LOCAL_EXPORT_PRODUCT = "不一样的日记" as const;

export const CHECK_IN_STATES = ["food", "rest", "tired", "visit"] as const;

export type CheckInState = (typeof CHECK_IN_STATES)[number];
export type LocalSchemaVersion =
  | typeof STAGE1_SCHEMA_VERSION
  | typeof STAGE2_SCHEMA_VERSION
  | typeof STAGE3_SCHEMA_VERSION;

export type LocalUserV1 = {
  id: string;
  createdAt: string;
  schemaVersion: LocalSchemaVersion;
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

export const LOCAL_IMAGE_MIME_TYPES = ["image/jpeg", "image/webp"] as const;

export type LocalImageMimeType = (typeof LOCAL_IMAGE_MIME_TYPES)[number];

export type LocalImageAttachmentV1 = {
  id: string;
  localUserId: string;
  checkInId: string;
  createdAt: string;
  mediaType: "image";
  mimeType: LocalImageMimeType;
  blob: Blob;
  byteSize: number;
  width: number;
  height: number;
  thumbnailBlob: Blob;
  thumbnailMimeType: LocalImageMimeType;
  thumbnailByteSize: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  processingVersion: 1;
};

export type CreateLocalImageAttachmentInput = {
  mimeType: LocalImageMimeType;
  blob: Blob;
  width: number;
  height: number;
  thumbnailBlob: Blob;
  thumbnailMimeType: LocalImageMimeType;
  thumbnailWidth: number;
  thumbnailHeight: number;
};

export type CreatePhotoCheckInInput = CreateCheckInInput & {
  image: CreateLocalImageAttachmentInput;
};

export type SavedPhotoCheckIn = {
  checkIn: CheckInV1;
  attachment: LocalImageAttachmentV1;
};

export const ACTIVITY_CATEGORIES = [
  "walking",
  "running",
  "strength",
  "cycling",
  "swimming",
  "ball",
  "stretching",
  "other",
  "unspecified",
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export type ActivityRecordV1 = {
  id: string;
  localUserId: string;
  checkInId: string;
  createdAt: string;
  category: ActivityCategory;
  customLabel: string | null;
  durationMinutes: number | null;
  steps: number | null;
  distanceKm: number | null;
  note: string | null;
};

export type CreateActivityRecordInput = {
  localUserId: string;
  category?: ActivityCategory | null;
  customLabel?: string | null;
  durationMinutes?: number | null;
  steps?: number | null;
  distanceKm?: number | null;
  note?: string | null;
  occurredAt?: string;
};

export type SavedActivityCheckIn = {
  checkIn: CheckInV1;
  activity: ActivityRecordV1;
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

export type LocalImageAttachmentMetadataV1 = Omit<
  LocalImageAttachmentV1,
  "blob" | "thumbnailBlob"
> & {
  binaryIncluded: false;
};

export type LocalExportV2 = {
  product: typeof LOCAL_EXPORT_PRODUCT;
  exportVersion: typeof LOCAL_EXPORT_VERSION_2;
  schemaVersion: typeof STAGE2_SCHEMA_VERSION;
  exportedAt: string;
  localUser: Pick<LocalUserV1, "id" | "createdAt">;
  checkIns: CheckInV1[];
  attachments: LocalImageAttachmentMetadataV1[];
};

export type LocalExportV3 = {
  product: typeof LOCAL_EXPORT_PRODUCT;
  exportVersion: typeof LOCAL_EXPORT_VERSION_3;
  schemaVersion: typeof STAGE3_SCHEMA_VERSION;
  exportedAt: string;
  localUser: Pick<LocalUserV1, "id" | "createdAt">;
  checkIns: CheckInV1[];
  attachments: LocalImageAttachmentMetadataV1[];
  activities: ActivityRecordV1[];
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
