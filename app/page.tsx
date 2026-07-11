"use client";

import {
  Armchair,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  Coffee,
  Database,
  Download,
  Dumbbell,
  FileText,
  Footprints,
  History,
  Home as HomeIcon,
  ImageDown,
  Leaf,
  type LucideIcon,
  PenLine,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  AmbientScene,
  type AmbientSceneTone,
} from "./ambient-scene";
import { ActivityFlow } from "./activity-flow";
import { ActivityReward } from "./activity-reward";
import { AIFlow } from "./ai-flow";
import {
  OnboardingGuide,
  ONBOARDING_PREFERENCE_KEY,
} from "./onboarding-guide";
import { PhotoFlow } from "./photo-flow";
import { TodayPoster } from "./today-poster";

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
} from "../lib/stage1";
import {
  PhotoProcessingError,
  processPhoto,
  recordPhotoOnly,
  type ProcessedPhoto,
} from "../lib/stage2";
import {
  createLocalExportJsonV3,
  formatActivitySummary,
  listActivities,
  recordActivityLocally,
  type CreateActivityRecordInput,
} from "../lib/stage3";
import { createTodayPosterModel } from "../lib/poster";

type View =
  | "home"
  | "branch"
  | "activity"
  | "ai"
  | "photo"
  | "poster"
  | "reply"
  | "write"
  | "saved"
  | "timeline"
  | "detail"
  | "data";

type BranchOption = {
  id: string;
  label: string;
};

type Branch = {
  id: CheckInState;
  icon: string;
  label: string;
  shortLabel: string;
  memoryLabel: string;
  hint: string;
  eyebrow: string;
  response: string;
  options: BranchOption[];
};

const branches: Branch[] = [
  {
    id: "food",
    icon: "食",
    label: "我想吃点东西",
    shortLabel: "想吃点东西",
    memoryLabel: "那时想吃点东西",
    hint: "先不算，也不劝你忍住",
    eyebrow: "想吃这件事，可以先被听见",
    response:
      "想吃就可以吃。你不需要先向我证明自己今天表现得很好。",
    options: [
      { id: "permission", label: "我只是想听你说，吃也没关系" },
      { id: "check-hunger", label: "陪我想想，我是真的饿还是太累了" },
      { id: "photo-no-calories", label: "我想拍下来，但不要算热量" },
      { id: "loose-range", label: "给我一个宽松的热量范围" },
      { id: "remember-only", label: "什么也不用做，替我记住就好" },
    ],
  },
  {
    id: "rest",
    icon: "歇",
    label: "我今天不想练",
    shortLabel: "今天不想练",
    memoryLabel: "那天选择休息",
    hint: "今天可以只休息",
    eyebrow: "今天已经消耗了不少力气",
    response:
      "不想练也可以。上班、通勤和处理生活，本来就在消耗你。",
    options: [
      { id: "full-rest", label: "今天就休息" },
      { id: "entertainment", label: "玩会儿游戏或看剧" },
      { id: "walk", label: "出门走走" },
      { id: "shopping", label: "逛逛商场或买点东西" },
      { id: "five-minutes", label: "做五分钟轻松活动" },
      { id: "quiet-company", label: "不想选，陪我待一会儿" },
    ],
  },
  {
    id: "tired",
    icon: "累",
    label: "我刚练完，很累",
    shortLabel: "刚练完，很累",
    memoryLabel: "练完以后很累",
    hint: "先喘口气，再说别的",
    eyebrow: "今天已经做得够多了",
    response: "现在不需要立刻证明这次运动值得。先让身体慢慢停下来。",
    options: [
      { id: "rest", label: "我只是想休息" },
      { id: "eat", label: "我现在很想吃" },
      { id: "remember", label: "顺手记下刚才的运动" },
      { id: "talk", label: "我想说说此刻的感受" },
    ],
  },
  {
    id: "visit",
    icon: "坐",
    label: "没什么，只是来坐坐",
    shortLabel: "只是来坐坐",
    memoryLabel: "只是回来坐了一会儿",
    hint: "没有任务，也算一种状态",
    eyebrow: "欢迎回来",
    response: "你不需要每次来都带着问题。我们可以安静待一会儿。",
    options: [
      { id: "light-word", label: "给我一句轻松的话" },
      { id: "quiet", label: "我想安静待着" },
      { id: "talk", label: "其实我有一点想说" },
      { id: "leave", label: "看一眼就走" },
    ],
  },
];

const homeStateIcons: Record<CheckInState, LucideIcon> = {
  food: Utensils,
  rest: Coffee,
  tired: Dumbbell,
  visit: Armchair,
};

function branchFor(state: CheckInState | null | undefined) {
  return branches.find((branch) => branch.id === state);
}

function intentLabel(state: CheckInState, intentId: string) {
  return (
    branchFor(state)?.options.find((option) => option.id === intentId)?.label ??
    "希望被轻轻接住"
  );
}

function localDateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function groupLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (localDateKey(value) === localDateKey(today.toISOString())) return "今天";
  if (localDateKey(value) === localDateKey(yesterday.toISOString())) {
    return "昨天";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
  }).format(date);
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function fullDateLabel(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default function Home() {
  const surfaceRef = useRef<HTMLElement>(null);
  const [view, setView] = useState<View>("home");
  const [activeBranchId, setActiveBranchId] =
    useState<CheckInState | null>(null);
  const [selectedIntentId, setSelectedIntentId] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] =
    useState<LocalResponse | null>(null);
  const [draftText, setDraftText] = useState("");
  const [localUser, setLocalUser] = useState<LocalUserV1 | null>(null);
  const [records, setRecords] = useState<CheckInV1[]>([]);
  const [attachments, setAttachments] = useState<LocalImageAttachmentV1[]>([]);
  const [activities, setActivities] = useState<ActivityRecordV1[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [lastSavedRecord, setLastSavedRecord] = useState<CheckInV1 | null>(null);
  const [lastSavedActivity, setLastSavedActivity] =
    useState<ActivityRecordV1 | null>(null);
  const [processedPhoto, setProcessedPhoto] = useState<ProcessedPhoto | null>(
    null,
  );
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

  async function remember(
    userText: string | null,
    responseOverride?: LocalResponse,
  ) {
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
      const saved = await recordActivityLocally({
        ...draft,
        localUserId: identity.id,
      });
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
      setRecords((current) =>
        current.filter((record) => record.id !== selectedRecordId),
      );
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
      link.download = `不一样的日记-本机记录-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
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

  return (
    <main className={`stage-shell motion-stage motion-stage--${view}`}>
      <AmbientScene tone={ambientTone} />
      <section
        className="app-surface motion-surface"
        data-tone={tone}
        data-view={view}
        aria-hidden={showOnboarding || undefined}
        aria-live="polite"
        ref={surfaceRef}
      >
        {view === "home" && (
          <div className="screen home-screen screen-enter motion-home">
            <header className="app-header">
              <div className="brand" aria-label="不一样的日记">
                <span className="brand-orbit" aria-hidden="true">
                  记
                </span>
                <span>不一样的日记</span>
              </div>
            </header>

            <div className="home-intro motion-hero">
              <h1>
                <span>你这会儿，</span>
                <br />
                <span>想从哪儿说起？</span>
              </h1>
              <p>挑一句顺口的就行。</p>
            </div>

            <button
              className="onboarding-trigger motion-rise"
              onClick={() => setShowOnboarding(true)}
              type="button"
            >
              <span aria-hidden="true"><Sparkles size={18} /></span>
              <span>
                <strong>第一次来？30 秒看看怎么用</strong>
                <small>也会告诉你，可选 AI 藏在哪里</small>
              </span>
              <ChevronRight size={17} aria-hidden="true" />
            </button>

            {storageError && (
              <div className="inline-notice" role="status">
                <span>{storageError}</span>
                <button type="button" onClick={() => window.location.reload()}>
                  <RotateCcw size={14} aria-hidden="true" />再试一次
                </button>
              </div>
            )}

            <section className="state-panel" aria-label="四个核心入口">
              <ul className="state-grid state-index">
                {branches.map((branch, index) => {
                  const StateIcon = homeStateIcons[branch.id];
                  return (
                    <li className="state-index-item" key={branch.id}>
                      <button
                        className="state-card motion-state-card state-entry"
                        data-testid={`branch-${branch.id}`}
                        onClick={() => openBranch(branch.id)}
                        style={{ "--motion-delay": `${index * 90}ms` } as React.CSSProperties}
                        type="button"
                      >
                        <span className="state-life-symbol" aria-hidden="true">
                          <StateIcon size={20} strokeWidth={1.65} />
                        </span>
                        <span className="state-card-copy">
                          <strong>{branch.label}</strong>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <nav className="home-tools" aria-label="本机工具">
              <button
                className="recent-link motion-rise utility-row photo-utility"
                onClick={() => openPhotoFlow("home")}
                type="button"
              >
                <span className="recent-link-icon" aria-hidden="true">
                  <Camera size={18} />
                </span>
                <span>
                  <strong>拍一张，先放在这里</strong>
                  <small>留住眼前这一刻</small>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>

              <button
                className="recent-link motion-rise utility-row activity-utility"
                onClick={() => openActivityFlow("home")}
                type="button"
              >
                <span className="recent-link-icon" aria-hidden="true">
                  <Footprints size={18} />
                </span>
                <span>
                  <strong>记一下运动</strong>
                  <small>类型、时长、步数和距离都可以跳过</small>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>

              <button className="recent-link motion-rise utility-row" onClick={openTimeline} type="button">
                <span className="recent-link-icon" aria-hidden="true">
                  <History size={18} />
                </span>
                <span>
                  <strong>翻翻最近</strong>
                  <small>按时间放着，不算分</small>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>

              <button
                className="recent-link motion-rise utility-row poster-utility"
                onClick={() => setView("poster")}
                type="button"
              >
                <span className="recent-link-icon" aria-hidden="true">
                  <ImageDown size={18} />
                </span>
                <span>
                  <strong>生成今天的海报</strong>
                  <small>把今天排成一张图</small>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </nav>
          </div>
        )}

        {view === "activity" && (
          <ActivityFlow
            busy={isSaving}
            error={storageError}
            onCancel={closeActivityFlow}
            onSave={rememberActivity}
          />
        )}

        {view === "photo" && activeBranch && currentResponse && (
          <PhotoFlow
            busy={isProcessingPhoto || isSaving}
            error={photoError ?? storageError}
            onCancel={closePhotoFlow}
            onFile={(file) => void preparePhoto(file)}
            onRecordOnly={() => void remember(null)}
            onWrite={() => setView("write")}
            previewUrl={photoPreviewUrl}
          />
        )}

        {view === "poster" && (
          <TodayPoster model={todayPosterModel} onBack={goHome} />
        )}

        {view === "ai" && activeBranch && currentResponse && (
          <AIFlow
            busySaving={isSaving}
            intentLabel={intentLabel(activeBranch.id, selectedIntentId ?? "")}
            localResponse={currentResponse}
            onCancel={() => setView("reply")}
            onSave={(userText, response) => void remember(userText, response)}
            state={activeBranch.id}
            stateLabel={activeBranch.shortLabel}
          />
        )}

        {view === "branch" && activeBranch && (
          <div className="screen branch-screen screen-enter motion-branch">
            <CalmBack label="回到四个入口" onClick={goHome} />
            <div className="branch-heading motion-heading">
              <span className="detail-glyph" aria-hidden="true">
                {activeBranch.icon}
              </span>
              <p>{activeBranch.eyebrow}</p>
              <h2>{activeBranch.shortLabel}</h2>
            </div>
            <div className="response-paper motion-response editorial-quote">
              <span>先听我说</span>
              <p>{activeBranch.response}</p>
            </div>
            <div className="choice-section">
              <p className="section-label">现在更希望我怎么陪你？</p>
              <ul className="choice-list hairline-list">
                {activeBranch.options.map((option, index) => (
                  <li className="hairline-list-item" key={option.id}>
                    <button
                      className="choice-row motion-choice hairline-row"
                      onClick={() => chooseIntent(option.id)}
                      style={{ "--motion-delay": `${180 + index * 55}ms` } as React.CSSProperties}
                      type="button"
                    >
                      <span>{option.label}</span>
                      <ArrowRight size={17} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <button className="quiet-action" onClick={goHome} type="button">
              现在什么也不想选
            </button>
          </div>
        )}

        {view === "reply" && activeBranch && currentResponse && (
          <div className="screen reply-screen screen-enter motion-reply">
            <CalmBack label="换一个选择" onClick={() => setView("branch")} />
            <div className="reply-orbit motion-orbit" aria-hidden="true">
              <span>{activeBranch.icon}</span>
            </div>
            <p className="soft-kicker centered">好，就按你说的来</p>
            <h2>{intentLabel(activeBranch.id, selectedIntentId ?? "")}</h2>
            <div className="final-reply motion-response editorial-quote">
              <p>{currentResponse.text}</p>
            </div>

            {storageError && (
              <div className="inline-notice" role="status">
                <span>{storageError}</span>
              </div>
            )}

            <div className="memory-actions motion-actions hairline-actions">
              <button
                className="memory-action-card hairline-row"
                disabled={isSaving}
                onClick={() => void remember(null)}
                type="button"
              >
                <span className="action-icon"><Leaf size={18} /></span>
                <span><strong>{isSaving ? "正在记下…" : "只记住这次"}</strong><small>不必再写什么</small></span>
                <ChevronRight size={17} aria-hidden="true" />
              </button>
              <button
                className="memory-action-card hairline-row"
                onClick={() => setView("write")}
                type="button"
              >
                <span className="action-icon"><PenLine size={18} /></span>
                <span><strong>写两句再记住</strong><small>从哪一句开始都可以</small></span>
                <ChevronRight size={17} aria-hidden="true" />
              </button>
              <button
                className="memory-action-card hairline-row ai-utility"
                onClick={() => setView("ai")}
                type="button"
              >
                <span className="action-icon"><Sparkles size={18} /></span>
                <span>
                  <strong>想让 AI 再听听 <span className="ai-discovery-label">可选 AI</span></strong>
                  <small>由你连接 Key，发送前再确认</small>
                </span>
                <ChevronRight size={17} aria-hidden="true" />
              </button>
              <button className="quiet-action" onClick={goHome} type="button">
                这次不保存
              </button>
            </div>
          </div>
        )}

        {view === "write" && activeBranch && currentResponse && (
          <div className="screen writing-screen screen-enter motion-write">
            <div className="writing-context" aria-hidden="true">
              <span>{activeBranch.icon}</span>
              <p>{currentResponse.text}</p>
            </div>
            <section className="writing-sheet motion-sheet" aria-labelledby="writing-title">
              <div className="sheet-handle" aria-hidden="true" />
              <header className="sheet-header">
                <div>
                  <span className="state-chip">{activeBranch.shortLabel}</span>
                  <h2 id="writing-title">写两句</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="关闭文字记录"
                  onClick={() => setView(processedPhoto ? "photo" : "reply")}
                  type="button"
                >
                  <X size={19} />
                </button>
              </header>
              <p className="sheet-copy">
                如果你愿意，可以把刚才没说完的留在这里。
              </p>
              <textarea
                aria-label="想留下的话"
                maxLength={1000}
                onChange={(event) => setDraftText(event.target.value)}
                placeholder="从哪一句开始都可以……"
                value={draftText}
              />
              {draftText.length > 900 && (
                <p className="character-count">还可以写 {1000 - draftText.length} 字</p>
              )}
              {storageError && (
                <div className="inline-notice" role="status">
                  <span>{storageError}</span>
                </div>
              )}
              <div className="sheet-actions">
                <button
                  className="primary-button"
                  disabled={isSaving}
                  onClick={() => void remember(draftText)}
                  type="button"
                >
                  <Check size={18} aria-hidden="true" />
                  {isSaving ? "正在记下…" : "记在本机"}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setView(processedPhoto ? "photo" : "reply")}
                  type="button"
                >
                  取消
                </button>
              </div>
            </section>
          </div>
        )}

        {view === "saved" && activeBranch && lastSavedRecord && (
          lastSavedActivity ? (
            <ActivityReward
              activity={lastSavedActivity}
              onHome={goHome}
              onTimeline={openTimeline}
            />
          ) : (
            <div className="screen saved-screen screen-enter motion-saved">
              <div className="saved-orbit motion-success" aria-hidden="true">
                <i className="saved-ripple saved-ripple-one" />
                <i className="saved-ripple saved-ripple-two" />
                <span>{activeBranch.icon}</span>
              </div>
              <p className="soft-kicker centered">已经轻轻放好了</p>
              <h2>已经记下了</h2>
              <p className="saved-copy">这次不用打分，也不必再补齐什么。</p>
              <div className="saved-actions">
                <button className="primary-button" onClick={goHome} type="button">
                  <HomeIcon size={18} aria-hidden="true" />回到首页
                </button>
                <button className="secondary-button" onClick={openTimeline} type="button">
                  <History size={18} aria-hidden="true" />看看最近
                </button>
              </div>
            </div>
          )
        )}

        {view === "timeline" && (
          <div className="screen timeline-screen screen-enter motion-timeline">
            <header className="section-header">
              <button className="icon-button" aria-label="回到首页" onClick={goHome} type="button">
                <ArrowLeft size={20} />
              </button>
              <div>
                <p>最近</p>
                <h2>发生了什么</h2>
              </div>
              <button className="text-button" onClick={() => setView("data")} type="button">
                <Database size={16} aria-hidden="true" />数据
              </button>
            </header>
            <p className="section-intro">这些都只留在这台设备上。</p>

            {dataNotice && <div className="calm-notice" role="status">{dataNotice}</div>}

            {records.length === 0 ? (
              <div className="empty-memory editorial-empty">
                <span className="empty-dot" aria-hidden="true" />
                <h3>这里还没有记录</h3>
                <p>你可以先去首页坐一会儿，也可以什么都不做。</p>
                <button className="secondary-button" onClick={goHome} type="button">
                  回到四个入口
                </button>
              </div>
            ) : (
              <div className="timeline-list">
                {groupedRecords.map((group) => (
                  <section className="memory-group" key={group.key}>
                    <h3>{group.label}</h3>
                    <ol className="memory-stack memory-ledger">
                      {group.records.map((record, recordIndex) => {
                        const branch = branchFor(record.state);
                        const attachment = attachmentsByCheckIn.get(record.id);
                        const activity = activitiesByCheckIn.get(record.id);
                        return (
                          <li className="memory-ledger-item" key={record.id}>
                            <button
                              className={`memory-card motion-memory-card ledger-entry ${attachment ? "memory-card--photo" : ""} ${activity ? "memory-card--activity" : ""}`}
                              data-tone={record.state}
                              onClick={() => openRecord(record.id)}
                              style={{ "--motion-delay": `${recordIndex * 70}ms` } as React.CSSProperties}
                              type="button"
                            >
                              <span className="memory-dot" aria-hidden="true" />
                              {attachment && (
                                <LocalBlobImage
                                  alt="这条记录的本机照片"
                                  blob={attachment.thumbnailBlob}
                                  className="memory-photo-thumbnail"
                                  height={attachment.thumbnailHeight}
                                  width={attachment.thumbnailWidth}
                                />
                              )}
                              <span className="memory-card-body">
                                <time className="memory-meta" dateTime={record.occurredAt}>
                                  <Clock3 size={13} aria-hidden="true" />
                                  {timeLabel(record.occurredAt)} · {activity ? "记了一次运动" : branch?.memoryLabel}
                                </time>
                                {activity ? (
                                  <>
                                    <strong>{formatActivitySummary(activity)}</strong>
                                    {activity.note && <small>“{activity.note}”</small>}
                                  </>
                                ) : (
                                  <>
                                    {record.userText && <strong>“{record.userText}”</strong>}
                                    <span className="memory-intent">
                                      {intentLabel(record.state, record.intentId)}
                                    </span>
                                    <small>{record.responseText}</small>
                                  </>
                                )}
                              </span>
                              <ChevronRight size={17} aria-hidden="true" />
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "detail" && selectedRecord && (
          <div className="screen detail-screen screen-enter motion-detail" data-tone={selectedRecord.state}>
            <CalmBack label="回到最近" onClick={openTimeline} />
            <div className="detail-heading">
              <span className="detail-glyph" aria-hidden="true">
                {selectedActivity ? <Footprints size={20} /> : branchFor(selectedRecord.state)?.icon}
              </span>
              <p>{fullDateLabel(selectedRecord.occurredAt)}</p>
              <h2>{selectedActivity ? "记下了一次运动" : branchFor(selectedRecord.state)?.memoryLabel}</h2>
            </div>
            {selectedAttachment && (
              <figure className="detail-photo">
                <LocalBlobImage
                  alt="这条记录保存在本机的照片"
                  blob={selectedAttachment.blob}
                  className="detail-photo-image"
                  height={selectedAttachment.height}
                  width={selectedAttachment.width}
                />
              </figure>
            )}
            <div className="detail-blocks motion-detail-blocks editorial-sections">
              {selectedActivity ? (
                <>
                  <section><span>这次记了</span><p>{formatActivitySummary(selectedActivity)}</p></section>
                  {selectedActivity.note && (
                    <section><span>还留了一句</span><p>“{selectedActivity.note}”</p></section>
                  )}
                  <section><span>这里想说</span><p>{selectedRecord.responseText}</p></section>
                </>
              ) : (
                <>
                  {selectedRecord.userText && (
                    <section><span>你当时说</span><p>“{selectedRecord.userText}”</p></section>
                  )}
                  <section><span>你希望</span><p>{intentLabel(selectedRecord.state, selectedRecord.intentId)}</p></section>
                  <section><span>这里回应了</span><p>{selectedRecord.responseText}</p></section>
                </>
              )}
            </div>
            {storageError && <div className="inline-notice" role="status">{storageError}</div>}
            <section className="delete-zone">
              <h3>不想再保留这条？</h3>
              <p>删除只会影响这台设备，删除后无法撤销。</p>
              {!confirmDelete ? (
                <button className="danger-button" onClick={() => setConfirmDelete(true)} type="button">
                  <Trash2 size={16} aria-hidden="true" />删除这一条
                </button>
              ) : (
                <div className="confirm-row">
                  <button className="secondary-button" onClick={() => setConfirmDelete(false)} type="button">先不删除</button>
                  <button className="danger-button solid" disabled={isDeleting} onClick={() => void removeSelectedRecord()} type="button">
                    {isDeleting ? "正在删除…" : "确认删除"}
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {view === "data" && (
          <div className="screen data-screen screen-enter motion-data">
            <CalmBack label="回到最近" onClick={openTimeline} />
            <div className="data-heading">
              <p className="soft-kicker"><ShieldCheck size={14} />控制权在你手里</p>
              <h2>本机数据</h2>
              <p>这里仍然没有账户，也没有云端副本。</p>
            </div>
            <section className="data-card local-data-card motion-data-card data-row data-row-info">
              <span className="data-card-icon"><Database size={20} /></span>
              <div><h3>只在当前设备</h3><p>身份和记录保存在浏览器的本机空间里。</p></div>
            </section>
            <section className="data-card motion-data-card data-row data-row-action">
              <span className="data-card-icon"><FileText size={20} /></span>
              <div><h3>导出一份副本</h3><p>{attachments.length ? "生成记录、运动详情与照片索引；照片文件仍留在本机。" : "生成包含运动详情的 JSON 文件，不会删除或上传原记录。"}</p></div>
              <button className="secondary-button" disabled={isExporting} onClick={() => void exportData()} type="button">
                <Download size={17} aria-hidden="true" />{isExporting ? "正在生成…" : "导出数据"}
              </button>
            </section>
            {dataNotice && <div className="calm-notice" role="status">{dataNotice}</div>}
            <section className="data-card danger-card motion-data-card data-row data-row-danger">
              <span className="data-card-icon"><Trash2 size={20} /></span>
              <div><h3>清空这台设备</h3><p>会删除本机身份和全部记录，无法撤销。</p></div>
              {!confirmClear ? (
                <button className="danger-button" onClick={() => setConfirmClear(true)} type="button">准备清空</button>
              ) : (
                <div className="clear-confirm">
                  <strong>要清空这台设备上的全部记录吗？</strong>
                  <p>这里没有云端副本。</p>
                  <div className="confirm-row">
                    <button className="secondary-button" onClick={() => setConfirmClear(false)} type="button">先不清空</button>
                    <button className="danger-button solid" disabled={isClearing} onClick={() => void clearAllData()} type="button">
                      {isClearing ? "正在清空…" : "确认清空"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </section>
      {showOnboarding && (
        <OnboardingGuide
          onClose={closeOnboarding}
          onComplete={closeOnboarding}
          open
        />
      )}
    </main>
  );
}

function LocalBlobImage({
  alt,
  blob,
  className,
  height,
  width,
}: {
  alt: string;
  blob: Blob;
  className: string;
  height: number;
  width: number;
}) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    const image = imageRef.current;
    if (image) image.src = objectUrl;
    return () => {
      if (image?.src === objectUrl) image.removeAttribute("src");
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  return (
    // The image source is a short-lived local Blob URL, so framework image
    // optimization would add work without creating a network-safe asset.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={className}
      height={height}
      ref={imageRef}
      width={width}
    />
  );
}

function CalmBack({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <header className="calm-backbar">
      <button className="back-button" onClick={onClick} type="button">
        <ArrowLeft size={18} aria-hidden="true" />{label}
      </button>
      <span className="no-task-pill">不用完成任务</span>
    </header>
  );
}
