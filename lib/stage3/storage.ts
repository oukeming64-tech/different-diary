import Dexie from "dexie";

import {
  ACTIVITY_CATEGORIES,
  createStableUuid,
  getStage1Database,
  type ActivityRecordV1,
  type CheckInV1,
  type CreateActivityRecordInput,
  type SavedActivityCheckIn,
  type Stage1Database,
  Stage1StorageError,
  toStage1StorageError,
} from "../stage1";

function isOptionalPositiveInteger(
  value: number | null | undefined,
  maximum: number,
): boolean {
  return (
    value == null ||
    (Number.isSafeInteger(value) && value > 0 && value <= maximum)
  );
}

function assertActivityInput(input: CreateActivityRecordInput): void {
  const category = input.category ?? "unspecified";
  const customLabel = input.customLabel?.trim() ?? "";
  const note = input.note?.trim() ?? "";
  const distanceKm = input.distanceKm;

  if (
    typeof input.localUserId !== "string" ||
    !input.localUserId.trim() ||
    !ACTIVITY_CATEGORIES.includes(category) ||
    customLabel.length > 40 ||
    note.length > 1000 ||
    !isOptionalPositiveInteger(input.durationMinutes, 1_440) ||
    !isOptionalPositiveInteger(input.steps, 200_000) ||
    (distanceKm != null &&
      (!Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > 1_000)) ||
    (input.occurredAt !== undefined && Number.isNaN(Date.parse(input.occurredAt)))
  ) {
    throw new Stage1StorageError(
      "INVALID_INPUT",
      "saveActivityCheckIn",
      "这条运动记录里有无法保存的内容。",
    );
  }
}

export async function saveActivityCheckIn(
  input: CreateActivityRecordInput,
  database: Stage1Database = getStage1Database(),
): Promise<SavedActivityCheckIn> {
  assertActivityInput(input);

  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const checkIn: CheckInV1 = {
    id: createStableUuid(),
    localUserId: input.localUserId,
    occurredAt,
    state: "tired",
    intentId: "activity-record",
    userText: null,
    responseKey: "tired.activity-record.local",
    responseText: "记下的是生活里真实发生过的事，不是成绩。",
    helpful: null,
  };
  const activity: ActivityRecordV1 = {
    id: createStableUuid(),
    localUserId: checkIn.localUserId,
    checkInId: checkIn.id,
    createdAt: occurredAt,
    category: input.category ?? "unspecified",
    customLabel: input.customLabel?.trim() || null,
    durationMinutes: input.durationMinutes ?? null,
    steps: input.steps ?? null,
    distanceKm: input.distanceKm ?? null,
    note: input.note?.trim() || null,
  };

  try {
    return await database.transaction(
      "rw",
      database.localUsers,
      database.checkIns,
      database.activities,
      async () => {
        if (!(await database.localUsers.get(input.localUserId))) {
          throw new Stage1StorageError(
            "INVALID_INPUT",
            "saveActivityCheckIn",
            "找不到这条记录对应的本机身份。",
          );
        }
        await database.checkIns.add(checkIn);
        await database.activities.add(activity);
        return { checkIn, activity };
      },
    );
  } catch (error) {
    throw toStage1StorageError("saveActivityCheckIn", error);
  }
}

export async function listActivities(
  localUserId: string,
  database: Stage1Database = getStage1Database(),
): Promise<ActivityRecordV1[]> {
  try {
    const activities = await database.activities
      .where("[localUserId+createdAt]")
      .between(
        [localUserId, Dexie.minKey],
        [localUserId, Dexie.maxKey],
        true,
        true,
      )
      .toArray();

    return activities.sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        right.id.localeCompare(left.id),
    );
  } catch (error) {
    throw toStage1StorageError("listActivities", error);
  }
}
