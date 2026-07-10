"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Database,
  Download,
  FileText,
  History,
  Home as HomeIcon,
  Leaf,
  PenLine,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  AmbientScene,
  type AmbientSceneTone,
} from "./ambient-scene";

import {
  clearAllLocalDataAndRecreateIdentity,
  createLocalExportJson,
  deleteCheckIn,
  ensureLocalIdentity,
  isStage1StorageError,
  listCheckIns,
  saveCheckIn,
  selectLocalResponse,
  type CheckInState,
  type CheckInV1,
  type LocalResponse,
  type LocalUserV1,
} from "../lib/stage1";

type View =
  | "home"
  | "branch"
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
      { id: "remember", label: "帮我记下今天练过了" },
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
  const [view, setView] = useState<View>("home");
  const [activeBranchId, setActiveBranchId] =
    useState<CheckInState | null>(null);
  const [selectedIntentId, setSelectedIntentId] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] =
    useState<LocalResponse | null>(null);
  const [draftText, setDraftText] = useState("");
  const [localUser, setLocalUser] = useState<LocalUserV1 | null>(null);
  const [records, setRecords] = useState<CheckInV1[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [lastSavedRecord, setLastSavedRecord] = useState<CheckInV1 | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [dataNotice, setDataNotice] = useState<string | null>(null);

  const activeBranch = branchFor(activeBranchId);
  const selectedRecord = records.find((record) => record.id === selectedRecordId);

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

  useEffect(() => {
    let active = true;

    async function prepareLocalSpace() {
      try {
        const identity = await ensureLocalIdentity();
        const localRecords = await listCheckIns(identity.id);
        if (!active) return;
        setLocalUser(identity);
        setRecords(localRecords);
        setStorageReady(true);
        setStorageError(null);
      } catch (error) {
        if (!active) return;
        setStorageReady(false);
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

  function resetConversation() {
    setActiveBranchId(null);
    setSelectedIntentId(null);
    setCurrentResponse(null);
    setDraftText("");
    setLastSavedRecord(null);
    setStorageError(null);
  }

  function goHome() {
    resetConversation();
    setView("home");
  }

  function openBranch(id: CheckInState) {
    setActiveBranchId(id);
    setSelectedIntentId(null);
    setCurrentResponse(null);
    setDraftText("");
    setStorageError(null);
    setView("branch");
  }

  function chooseIntent(intentId: string) {
    if (!activeBranchId) return;
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

  async function ensureIdentityForSave() {
    if (localUser) return localUser;
    const identity = await ensureLocalIdentity();
    setLocalUser(identity);
    setStorageReady(true);
    return identity;
  }

  async function remember(userText: string | null) {
    if (!activeBranchId || !selectedIntentId || !currentResponse) return;
    setIsSaving(true);
    setStorageError(null);
    try {
      const identity = await ensureIdentityForSave();
      const record = await saveCheckIn({
        localUserId: identity.id,
        state: activeBranchId,
        intentId: selectedIntentId,
        userText: userText?.trim() || null,
        responseKey: currentResponse.key,
        responseText: currentResponse.text,
      });
      setRecords((current) => [record, ...current]);
      setLastSavedRecord(record);
      setStorageReady(true);
      setView("saved");
    } catch {
      setStorageReady(false);
      setStorageError("这次没有成功记住。你写下的内容还在。");
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
      const json = await createLocalExportJson();
      const url = URL.createObjectURL(
        new Blob([json], { type: "application/json;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `减肥拍拍乐-本机记录-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setDataNotice("副本已经生成，本机记录没有变化。");
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
      : view === "timeline" || view === "detail" || view === "data"
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
        aria-live="polite"
      >
        {view === "home" && (
          <div className="screen home-screen screen-enter motion-home">
            <header className="app-header">
              <div className="brand" aria-label="减肥拍拍乐">
                <span className="brand-orbit" aria-hidden="true">
                  啪
                </span>
                <span>减肥拍拍乐</span>
              </div>
              <span className="local-pill">
                <ShieldCheck size={13} aria-hidden="true" />
                {storageReady ? "只在本机" : "本机模式"}
              </span>
            </header>

            <div className="home-intro motion-hero">
              <p className="soft-kicker">
                <Sparkles size={14} aria-hidden="true" />
                嗨，先不用交作业
              </p>
              <h1>你现在需要什么？</h1>
              <p>选一个最接近的就好。这里没有正确答案。</p>
            </div>

            {storageError && (
              <div className="inline-notice" role="status">
                <span>{storageError}</span>
                <button type="button" onClick={() => window.location.reload()}>
                  <RotateCcw size={14} aria-hidden="true" />再试一次
                </button>
              </div>
            )}

            <div className="state-grid" aria-label="四个核心入口">
              {branches.map((branch, index) => (
                <button
                  className="state-card motion-state-card"
                  data-tone={branch.id}
                  data-testid={`branch-${branch.id}`}
                  key={branch.id}
                  onClick={() => openBranch(branch.id)}
                  style={{ "--motion-delay": `${index * 90}ms` } as React.CSSProperties}
                  type="button"
                >
                  <span className="state-card-top">
                    <span className="state-glyph" aria-hidden="true">
                      {branch.icon}
                    </span>
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </span>
                  <span className="state-card-copy">
                    <strong>{branch.label}</strong>
                    <small>{branch.hint}</small>
                  </span>
                </button>
              ))}
            </div>

            <button className="recent-link motion-rise" onClick={openTimeline} type="button">
              <span className="recent-link-icon" aria-hidden="true">
                <History size={18} />
              </span>
              <span>
                <strong>看看最近发生了什么</strong>
                <small>像翻开几页，不做统计</small>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>

            <footer className="local-note">
              <span aria-hidden="true" />
              记录只留在这台设备上
            </footer>
          </div>
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
            <div className="response-paper motion-response">
              <span>先听我说</span>
              <p>{activeBranch.response}</p>
            </div>
            <div className="choice-section">
              <p className="section-label">现在更希望我怎么陪你？</p>
              <div className="choice-list">
                {activeBranch.options.map((option, index) => (
                  <button
                    className="choice-row motion-choice"
                    key={option.id}
                    onClick={() => chooseIntent(option.id)}
                    style={{ "--motion-delay": `${180 + index * 55}ms` } as React.CSSProperties}
                    type="button"
                  >
                    <span>{option.label}</span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                ))}
              </div>
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
            <div className="final-reply motion-response">
              <p>{currentResponse.text}</p>
            </div>

            {storageError && (
              <div className="inline-notice" role="status">
                <span>{storageError}</span>
              </div>
            )}

            <div className="memory-actions motion-actions">
              <button
                className="memory-action-card"
                disabled={isSaving}
                onClick={() => void remember(null)}
                type="button"
              >
                <span className="action-icon"><Leaf size={18} /></span>
                <span><strong>{isSaving ? "正在记下…" : "只记住这次"}</strong><small>不必再写什么</small></span>
                <ChevronRight size={17} aria-hidden="true" />
              </button>
              <button
                className="memory-action-card"
                onClick={() => setView("write")}
                type="button"
              >
                <span className="action-icon"><PenLine size={18} /></span>
                <span><strong>写两句再记住</strong><small>从哪一句开始都可以</small></span>
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
                  onClick={() => setView("reply")}
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
                  onClick={() => setView("reply")}
                  type="button"
                >
                  取消
                </button>
              </div>
            </section>
          </div>
        )}

        {view === "saved" && activeBranch && lastSavedRecord && (
          <div className="screen saved-screen screen-enter motion-saved">
            <div className="saved-orbit motion-success" aria-hidden="true">
              <i className="saved-ripple saved-ripple-one" />
              <i className="saved-ripple saved-ripple-two" />
              <span>{activeBranch.icon}</span>
            </div>
            <p className="soft-kicker centered">已经轻轻放好了</p>
            <h2>已经记下了</h2>
            <p className="saved-copy">这里不需要给今天打分。</p>
            <span className="saved-local">
              <ShieldCheck size={14} aria-hidden="true" />
              只保存在这台设备上
            </span>
            <div className="saved-actions">
              <button className="primary-button" onClick={goHome} type="button">
                <HomeIcon size={18} aria-hidden="true" />回到首页
              </button>
              <button className="secondary-button" onClick={openTimeline} type="button">
                <History size={18} aria-hidden="true" />看看最近
              </button>
            </div>
          </div>
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
              <div className="empty-memory">
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
                    <div className="memory-stack">
                      {group.records.map((record, recordIndex) => {
                        const branch = branchFor(record.state);
                        return (
                          <button
                            className="memory-card motion-memory-card"
                            data-tone={record.state}
                            key={record.id}
                            onClick={() => openRecord(record.id)}
                            style={{ "--motion-delay": `${recordIndex * 70}ms` } as React.CSSProperties}
                            type="button"
                          >
                            <span className="memory-dot" aria-hidden="true" />
                            <span className="memory-card-body">
                              <span className="memory-meta">
                                <Clock3 size={13} aria-hidden="true" />
                                {timeLabel(record.occurredAt)} · {branch?.memoryLabel}
                              </span>
                              {record.userText && <strong>“{record.userText}”</strong>}
                              <span className="memory-intent">
                                {intentLabel(record.state, record.intentId)}
                              </span>
                              <small>{record.responseText}</small>
                            </span>
                            <ChevronRight size={17} aria-hidden="true" />
                          </button>
                        );
                      })}
                    </div>
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
                {branchFor(selectedRecord.state)?.icon}
              </span>
              <p>{fullDateLabel(selectedRecord.occurredAt)}</p>
              <h2>{branchFor(selectedRecord.state)?.memoryLabel}</h2>
            </div>
            <div className="detail-blocks motion-detail-blocks">
              {selectedRecord.userText && (
                <section><span>你当时说</span><p>“{selectedRecord.userText}”</p></section>
              )}
              <section><span>你希望</span><p>{intentLabel(selectedRecord.state, selectedRecord.intentId)}</p></section>
              <section><span>这里回应了</span><p>{selectedRecord.responseText}</p></section>
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
              <p>阶段 1 没有账户，也没有云端副本。</p>
            </div>
            <section className="data-card local-data-card motion-data-card">
              <span className="data-card-icon"><Database size={20} /></span>
              <div><h3>只在当前设备</h3><p>身份和记录保存在浏览器的本机空间里。</p></div>
            </section>
            <section className="data-card motion-data-card">
              <span className="data-card-icon"><FileText size={20} /></span>
              <div><h3>导出一份副本</h3><p>生成 JSON 文件，不会删除或上传原记录。</p></div>
              <button className="secondary-button" disabled={isExporting} onClick={() => void exportData()} type="button">
                <Download size={17} aria-hidden="true" />{isExporting ? "正在生成…" : "导出数据"}
              </button>
            </section>
            {dataNotice && <div className="calm-notice" role="status">{dataNotice}</div>}
            <section className="data-card danger-card motion-data-card">
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
    </main>
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
