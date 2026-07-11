"use client";

import {
  ArrowRight,
  Check,
  ChevronRight,
  History,
  Home as HomeIcon,
  Leaf,
  PenLine,
  Sparkles,
  X,
} from "lucide-react";
import type { CSSProperties } from "react";

import { ActivityReward } from "../activity-reward";
import { intentLabel } from "./model";
import { CalmBack } from "./shared";
import type { DiaryController } from "./use-diary-controller";

export function BranchScreen({ controller }: { controller: DiaryController }) {
  const { activeBranch, chooseIntent, goHome } = controller;
  if (!activeBranch) return null;

  return (
    <div className="screen branch-screen screen-enter motion-branch">
      <CalmBack label="回到四个入口" onClick={goHome} />
      <div className="branch-heading motion-heading">
        <span className="detail-glyph" aria-hidden="true">{activeBranch.icon}</span>
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
                style={{ "--motion-delay": `${180 + index * 55}ms` } as CSSProperties}
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
  );
}

export function ReplyScreen({ controller }: { controller: DiaryController }) {
  const {
    activeBranch,
    currentResponse,
    selectedIntentId,
    storageError,
    isSaving,
    remember,
    setView,
    goHome,
  } = controller;
  if (!activeBranch || !currentResponse) return null;

  return (
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

      {storageError && <div className="inline-notice" role="status"><span>{storageError}</span></div>}

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
        <button className="memory-action-card hairline-row" onClick={() => setView("write")} type="button">
          <span className="action-icon"><PenLine size={18} /></span>
          <span><strong>写两句再记住</strong><small>从哪一句开始都可以</small></span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>
        <button className="memory-action-card hairline-row ai-utility" onClick={() => setView("ai")} type="button">
          <span className="action-icon"><Sparkles size={18} /></span>
          <span>
            <strong>想让 AI 再听听 <span className="ai-discovery-label">可选 AI</span></strong>
            <small>由你连接 Key，发送前再确认</small>
          </span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>
        <button className="quiet-action" onClick={goHome} type="button">这次不保存</button>
      </div>
    </div>
  );
}

export function WritingScreen({ controller }: { controller: DiaryController }) {
  const {
    activeBranch,
    currentResponse,
    processedPhoto,
    draftText,
    setDraftText,
    storageError,
    isSaving,
    remember,
    setView,
  } = controller;
  if (!activeBranch || !currentResponse) return null;
  const previousView = processedPhoto ? "photo" : "reply";

  return (
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
            onClick={() => setView(previousView)}
            type="button"
          >
            <X size={19} />
          </button>
        </header>
        <p className="sheet-copy">如果你愿意，可以把刚才没说完的留在这里。</p>
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
        {storageError && <div className="inline-notice" role="status"><span>{storageError}</span></div>}
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
          <button className="secondary-button" onClick={() => setView(previousView)} type="button">
            取消
          </button>
        </div>
      </section>
    </div>
  );
}

export function SavedScreen({ controller }: { controller: DiaryController }) {
  const { activeBranch, lastSavedRecord, lastSavedActivity, goHome, openTimeline } = controller;
  if (!activeBranch || !lastSavedRecord) return null;

  if (lastSavedActivity) {
    return (
      <ActivityReward
        activity={lastSavedActivity}
        onHome={goHome}
        onTimeline={openTimeline}
      />
    );
  }

  return (
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
  );
}
