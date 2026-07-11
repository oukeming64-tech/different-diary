"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { AmbientSceneTone } from "../ambient-scene";
import { ONBOARDING_PREFERENCE_KEY } from "../onboarding-guide";
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
  saveCheckIn,
  selectLocalResponse,
  type ActivityRecordV1,
  type CheckInState,
  type CheckInV1,
  type LocalImageAttachmentV1,
  type LocalResponse,
  type LocalUserV1,
} from "../../lib/stage1";
import {
  PhotoProcessingError,
  processPhoto,
  recordPhotoOnly,
  type ProcessedPhoto,
} from "../../lib/stage2";
import {
  createLocalExportJsonV3,
  listActivities,
  recordActivityLocally,
  type CreateActivityRecordInput,
} from "../../lib/stage3";
import {
  branchFor,
  groupLabel,
  localDateKey,
  type DiaryView,
} from "./model";

export function useDiaryController() {
  const surfaceRef = useRef<HTMLElement>(null);
  const [view, setView] = useState<DiaryView>("home");
  const [activeBranchId, setActiveBranchId] = useState<CheckInState | null>(null);
  const [selectedIntentId, setSelectedIntentId] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = useState<LocalResponse | null>(null);
  const [draftText, setDraftText] = useState("");
  const [localUser, setLocalUser] = useState<LocalUserV1 | null>(null);
  const [records, setRecords] = useState<CheckInV1[]>([]);
  const [attachments, setAttachments] = useState<LocalImageAttachmentV1[]>([]);
  const [activities, setActivities] = useState<ActivityRecordV1[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [lastSavedRecord, setLastSavedRecord] = useState<CheckInV1 | null>(null);
  const [lastSavedActivity, setLastSavedActivity] = useState<ActivityRecordV1 | null>(null);
  const [processedPhoto, setProcessedPhoto] = useState<ProcessedPhoto | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoOrigin, setPhotoOrigin] = useState<"home" | "branch">("home");
  const [activityOrigin, setActivityOrigin] = useState<"home" | "branch">("home");
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [dataNotice, setDataNotice] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const activeBranch = branchFor(activeBranchId);
  const selectedRecord = records.find((record) => record.id === selectedRecordId);
  const attachmentsByCheckIn = useMemo(
    () => new Map(attachments.map((attachment) => [attachment.checkInId, attachment])),
    [attachments],
  );
  const selectedAttachment = selectedRecord
    ? attachmentsByCheckIn.get(selectedRecord.id)
    : undefined;
  const activitiesByCheckIn = useMemo(
    () => new Map(activities.map((activity) => [activity.checkInId, activity])),
    [activities],
  );
  const selectedActivity = selectedRecord
    ? activitiesByCheckIn.get(selectedRecord.id)
    : undefined;
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
        setStorageError(null);
        if (localRecords.length === 0) {
          try {
            if (window.localStorage.getItem(ONBOARDING_PREFERENCE_KEY) !== "done") {
              setShowOnboarding(true);
            }
          } catch {
            setShowOnboarding(true);
          }
        }
      } catch (error) {
        if (!active) return;
        setStorageError(
          isStage1StorageError(error)
            ? "这次暂时不能留在本机，但你仍然可以继续看回应。"
            : "本机空间暂时没有准备好。你仍然可以继续看回应。",
        );
      }
    }

    void prepareLocalSpace();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (surfaceRef.current) surfaceRef.current.scrollTop = 0;
  }, [view]);

  useEffect(
    () => () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    },
    [photoPreviewUrl],
  );

  function clearPhotoDraft() {
    setProcessedPhoto(null);
    setPhotoPreviewUrl(null);
    setPhotoError(null);
    setIsProcessingPhoto(false);
  }

  function resetConversation() {
    setActiveBranchId(null);
    setSelectedIntentId(null);
    setCurrentResponse(null);
    setDraftText("");
    setLastSavedRecord(null);
    setLastSavedActivity(null);
    setStorageError(null);
    clearPhotoDraft();
  }

  function goHome() {
    resetConversation();
    setView("home");
  }

  function closeOnboarding() {
    try {
      window.localStorage.setItem(ONBOARDING_PREFERENCE_KEY, "done");
    } catch {
      // The guide is a non-authoritative UI preference; storage failure is safe.
    }
    setShowOnboarding(false);
  }

  function openBranch(id: CheckInState) {
    clearPhotoDraft();
    setActiveBranchId(id);
    setSelectedIntentId(null);
    setCurrentResponse(null);
    setDraftText("");
    setStorageError(null);
    setView("branch");
  }

  function openPhotoFlow(origin: "home" | "branch") {
    const branchId = activeBranchId ?? "food";
    const intentId = "photo-no-calories";
    const response = selectLocalResponse({
      state: branchId,
      intentId,
      recentResponseKeys: records.map((record) => record.responseKey),
    });
    clearPhotoDraft();
    setPhotoOrigin(origin);
    setActiveBranchId(branchId);
    setSelectedIntentId(intentId);
    setCurrentResponse(response);
    setDraftText("");
    setStorageError(null);
    setView("photo");
  }

  function openActivityFlow(origin: "home" | "branch") {
    clearPhotoDraft();
    setActivityOrigin(origin);
    setActiveBranchId("tired");
    setSelectedIntentId("activity-record");
    setCurrentResponse(null);
    setStorageError(null);
    setView("activity");
  }

  function closeActivityFlow() {
    setStorageError(null);
    if (activityOrigin === "branch") setView("branch");
    else goHome();
  }

  function chooseIntent(intentId: string) {
    if (!activeBranchId) return;
    if (activeBranchId === "food" && intentId === "photo-no-calories") {
      openPhotoFlow("branch");
      return;
    }
    if (activeBranchId === "tired" && intentId === "remember") {
      openActivityFlow("branch");
      return;
    }
    const response = selectLocalResponse({
      state: activeBranchId,
      intentId,
      recentResponseKeys: records.map((record) => record.responseKey),
    });
    setSelectedIntentId(intentId);
    setCurrentResponse(response);
    setStorageError(null);
    setView("reply");
  }

  async function preparePhoto(file: File) {
    setIsProcessingPhoto(true);
    setPhotoError(null);
    try {
      const photo = await processPhoto(file);
      setProcessedPhoto(photo);
      setPhotoPreviewUrl(URL.createObjectURL(photo.blob));
    } catch (error) {
      setPhotoError(
        error instanceof PhotoProcessingError
          ? error.message
          : "这张图片暂时没能在本机整理好，因此没有保存，也没有发送。",
      );
    } finally {
      setIsProcessingPhoto(false);
    }
  }

  function closePhotoFlow() {
    clearPhotoDraft();
    if (photoOrigin === "branch") setView("branch");
    else goHome();
  }

  async function ensureIdentityForSave() {
    if (localUser) return localUser;
    const identity = await ensureLocalIdentity();
    setLocalUser(identity);
    return identity;
  }

  async function remember(userText: string | null, responseOverride?: LocalResponse) {
    const response = responseOverride ?? currentResponse;
    if (!activeBranchId || !selectedIntentId || !response) return;
    setIsSaving(true);
    setStorageError(null);
    try {
      const identity = await ensureIdentityForSave();
      const savedPhoto = processedPhoto
        ? await recordPhotoOnly({
            image: processedPhoto,
            localUserId: identity.id,
            state: activeBranchId,
            intentId: selectedIntentId,
            userText: userText?.trim() || null,
            responseKey: response.key,
            responseText: response.text,
          })
        : null;
      const record = savedPhoto
        ? savedPhoto.checkIn
        : await saveCheckIn({
            localUserId: identity.id,
            state: activeBranchId,
            intentId: selectedIntentId,
            userText: userText?.trim() || null,
            responseKey: response.key,
            responseText: response.text,
          });
      setRecords((current) => [record, ...current]);
      if (savedPhoto) {
        setAttachments((current) => [savedPhoto.attachment, ...current]);
      }
      setLastSavedActivity(null);
      setLastSavedRecord(record);
      if (savedPhoto) clearPhotoDraft();
      setView("saved");
    } catch {
      setStorageError(
        processedPhoto
          ? "这次没有成功放进本机。照片和你写下的内容还在这里。"
          : "这次没有成功记住。你写下的内容还在。",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function rememberActivity(
    draft: Omit<CreateActivityRecordInput, "localUserId">,
  ) {
    setIsSaving(true);
    setStorageError(null);
    try {
      const identity = await ensureIdentityForSave();
      const saved = await recordActivityLocally({ ...draft, localUserId: identity.id });
      setRecords((current) => [saved.checkIn, ...current]);
      setActivities((current) => [saved.activity, ...current]);
      setLastSavedRecord(saved.checkIn);
      setLastSavedActivity(saved.activity);
      setView("saved");
    } catch {
      setStorageError("这次没有成功记住。刚才填的内容还在这里，可以再试一次。");
    } finally {
      setIsSaving(false);
    }
  }

  function openTimeline() {
    setDataNotice(null);
    setView("timeline");
  }

  function openRecord(id: string) {
    setSelectedRecordId(id);
    setConfirmDelete(false);
    setView("detail");
  }

  async function removeSelectedRecord() {
    if (!selectedRecordId) return;
    setIsDeleting(true);
    setStorageError(null);
    try {
      await deleteCheckIn(selectedRecordId);
      setRecords((current) => current.filter((record) => record.id !== selectedRecordId));
      setAttachments((current) =>
        current.filter((attachment) => attachment.checkInId !== selectedRecordId),
      );
      setActivities((current) =>
        current.filter((activity) => activity.checkInId !== selectedRecordId),
      );
      setSelectedRecordId(null);
      setConfirmDelete(false);
      setView("timeline");
    } catch {
      setStorageError("这条记录暂时没有删掉，它仍然留在本机。再试一次就好。");
    } finally {
      setIsDeleting(false);
    }
  }

  async function exportData() {
    setIsExporting(true);
    setDataNotice(null);
    try {
      const json = activities.length
        ? await createLocalExportJsonV3()
        : attachments.length
          ? await createLocalExportJsonV2()
          : await createLocalExportJson();
      const url = URL.createObjectURL(
        new Blob([json], { type: "application/json;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `不一样的日记-本机记录-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setDataNotice(
        attachments.length
          ? "记录、运动详情和照片索引已经生成；照片文件仍只留在本机。"
          : activities.length
            ? "记录和运动详情已经生成副本，本机内容没有变化。"
            : "副本已经生成，本机记录没有变化。",
      );
    } catch {
      setDataNotice("暂时没有生成文件，本机记录没有变化。");
    } finally {
      setIsExporting(false);
    }
  }

  async function clearAllData() {
    setIsClearing(true);
    setDataNotice(null);
    try {
      const replacement = await clearAllLocalDataAndRecreateIdentity();
      setLocalUser(replacement);
      setRecords([]);
      setAttachments([]);
      setActivities([]);
      setConfirmClear(false);
      setSelectedRecordId(null);
      setDataNotice("本机记录已经清空。没有云端副本。");
      setView("timeline");
    } catch {
      setDataNotice("没有全部清空。本机记录仍保留着。");
    } finally {
      setIsClearing(false);
    }
  }

  const tone = activeBranchId ?? selectedRecord?.state ?? "visit";
  const ambientTone: AmbientSceneTone =
    view === "home"
      ? "home"
      : view === "timeline" || view === "detail" || view === "data" || view === "poster"
        ? "memory"
        : tone === "visit"
          ? "sit"
          : tone;

  return {
    surfaceRef,
    view,
    setView,
    tone,
    ambientTone,
    showOnboarding,
    setShowOnboarding,
    activeBranch,
    activeBranchId,
    selectedIntentId,
    currentResponse,
    draftText,
    setDraftText,
    records,
    attachments,
    activities,
    attachmentsByCheckIn,
    activitiesByCheckIn,
    groupedRecords,
    selectedRecord,
    selectedAttachment,
    selectedActivity,
    lastSavedRecord,
    lastSavedActivity,
    processedPhoto,
    photoPreviewUrl,
    photoError,
    storageError,
    dataNotice,
    todayPosterModel,
    isProcessingPhoto,
    isSaving,
    isDeleting,
    isExporting,
    isClearing,
    confirmDelete,
    setConfirmDelete,
    confirmClear,
    setConfirmClear,
    closeOnboarding,
    goHome,
    openBranch,
    openPhotoFlow,
    openActivityFlow,
    closeActivityFlow,
    chooseIntent,
    preparePhoto,
    closePhotoFlow,
    remember,
    rememberActivity,
    openTimeline,
    openRecord,
    removeSelectedRecord,
    exportData,
    clearAllData,
  };
}

export type DiaryController = ReturnType<typeof useDiaryController>;
