import { useEffect, useMemo, useState } from "react";

import { createTodayPosterModel } from "../../lib/poster";
import {
  clearAllLocalDataAndRecreateIdentity,
  createLocalExportJson,
  createLocalExportJsonV2,
  deleteCheckIn,
  ensureLocalIdentity,
  isStage1StorageError,
  listAttachments,
  listCheckIns,
  type ActivityRecordV1,
  type CheckInV1,
  type LocalImageAttachmentV1,
  type LocalUserV1,
} from "../../lib/stage1";
import { createLocalExportJsonV3, listActivities } from "../../lib/stage3";
import { groupLabel, localDateKey } from "./model";

export function useLocalDiaryLibrary() {
  const [localUser, setLocalUser] = useState<LocalUserV1 | null>(null);
  const [records, setRecords] = useState<CheckInV1[]>([]);
  const [attachments, setAttachments] = useState<LocalImageAttachmentV1[]>([]);
  const [activities, setActivities] = useState<ActivityRecordV1[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [wasEmptyOnFirstOpen, setWasEmptyOnFirstOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function prepareLocalSpace() {
      try {
        const identity = await ensureLocalIdentity();
        const [localRecords, localAttachments, localActivities] = await Promise.all([
          listCheckIns(identity.id),
          listAttachments(identity.id),
          listActivities(identity.id),
        ]);
        if (!active) return;
        setLocalUser(identity);
        setRecords(localRecords);
        setAttachments(localAttachments);
        setActivities(localActivities);
        setWasEmptyOnFirstOpen(localRecords.length === 0);
        setStorageError(null);
      } catch (error) {
        if (!active) return;
        setStorageError(
          isStage1StorageError(error)
            ? "这次暂时不能留在本机，但你仍然可以继续看回应。"
            : "本机空间暂时没有准备好。你仍然可以继续看回应。",
        );
      } finally {
        if (active) setIsReady(true);
      }
    }

    void prepareLocalSpace();
    return () => {
      active = false;
    };
  }, []);

  const attachmentsByCheckIn = useMemo(
    () => new Map(attachments.map((attachment) => [attachment.checkInId, attachment])),
    [attachments],
  );
  const activitiesByCheckIn = useMemo(
    () => new Map(activities.map((activity) => [activity.checkInId, activity])),
    [activities],
  );
  const groupedRecords = useMemo(() => {
    const groups: Array<{ key: string; label: string; records: CheckInV1[] }> = [];
    for (const record of records) {
      const key = localDateKey(record.occurredAt);
      const label = groupLabel(record.occurredAt);
      const current = groups.at(-1);
      if (current?.key === key) current.records.push(record);
      else groups.push({ key, label, records: [record] });
    }
    return groups;
  }, [records]);
  const todayPosterModel = useMemo(
    () => createTodayPosterModel({ records, activities }),
    [activities, records],
  );

  async function ensureIdentityForSave() {
    if (localUser) return localUser;
    const identity = await ensureLocalIdentity();
    setLocalUser(identity);
    return identity;
  }

  function addCheckIn(record: CheckInV1, attachment?: LocalImageAttachmentV1) {
    setRecords((current) => [record, ...current]);
    if (attachment) setAttachments((current) => [attachment, ...current]);
  }

  function addActivity(checkIn: CheckInV1, activity: ActivityRecordV1) {
    setRecords((current) => [checkIn, ...current]);
    setActivities((current) => [activity, ...current]);
  }

  async function removeRecord(recordId: string) {
    await deleteCheckIn(recordId);
    setRecords((current) => current.filter((record) => record.id !== recordId));
    setAttachments((current) =>
      current.filter((attachment) => attachment.checkInId !== recordId),
    );
    setActivities((current) =>
      current.filter((activity) => activity.checkInId !== recordId),
    );
  }

  async function createExport() {
    if (activities.length) return createLocalExportJsonV3();
    if (attachments.length) return createLocalExportJsonV2();
    return createLocalExportJson();
  }

  async function clearLibrary() {
    const replacement = await clearAllLocalDataAndRecreateIdentity();
    setLocalUser(replacement);
    setRecords([]);
    setAttachments([]);
    setActivities([]);
  }

  return {
    records,
    attachments,
    activities,
    storageError,
    setStorageError,
    isReady,
    wasEmptyOnFirstOpen,
    attachmentsByCheckIn,
    activitiesByCheckIn,
    groupedRecords,
    todayPosterModel,
    ensureIdentityForSave,
    addCheckIn,
    addActivity,
    removeRecord,
    createExport,
    clearLibrary,
  };
}
