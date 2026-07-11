"use client";

import {
  Armchair,
  Camera,
  ChevronRight,
  Coffee,
  Dumbbell,
  Footprints,
  History,
  ImageDown,
  RotateCcw,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";

import type { CheckInState } from "../../lib/stage1";
import { branches } from "./model";
import type { DiaryController } from "./use-diary-controller";

const stateIcons: Record<CheckInState, LucideIcon> = {
  food: Utensils,
  rest: Coffee,
  tired: Dumbbell,
  visit: Armchair,
};

export function HomeScreen({ controller }: { controller: DiaryController }) {
  const {
    storageError,
    setShowOnboarding,
    openBranch,
    openPhotoFlow,
    openActivityFlow,
    openTimeline,
    setView,
  } = controller;

  return (
    <div className="screen home-screen screen-enter motion-home">
      <header className="app-header">
        <div className="brand" aria-label="不一样的日记">
          <span className="brand-orbit" aria-hidden="true">记</span>
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
            const StateIcon = stateIcons[branch.id];
            return (
              <li className="state-index-item" key={branch.id}>
                <button
                  className="state-card motion-state-card state-entry"
                  data-testid={`branch-${branch.id}`}
                  onClick={() => openBranch(branch.id)}
                  style={{ "--motion-delay": `${index * 90}ms` } as CSSProperties}
                  type="button"
                >
                  <span className="state-life-symbol" aria-hidden="true">
                    <StateIcon size={20} strokeWidth={1.65} />
                  </span>
                  <span className="state-card-copy"><strong>{branch.label}</strong></span>
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
          <span className="recent-link-icon" aria-hidden="true"><Camera size={18} /></span>
          <span><strong>拍一张，先放在这里</strong><small>留住眼前这一刻</small></span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>

        <button
          className="recent-link motion-rise utility-row activity-utility"
          onClick={() => openActivityFlow("home")}
          type="button"
        >
          <span className="recent-link-icon" aria-hidden="true"><Footprints size={18} /></span>
          <span><strong>记一下运动</strong><small>类型、时长、步数和距离都可以跳过</small></span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>

        <button className="recent-link motion-rise utility-row" onClick={openTimeline} type="button">
          <span className="recent-link-icon" aria-hidden="true"><History size={18} /></span>
          <span><strong>翻翻最近</strong><small>按时间放着，不算分</small></span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>

        <button
          className="recent-link motion-rise utility-row poster-utility"
          onClick={() => setView("poster")}
          type="button"
        >
          <span className="recent-link-icon" aria-hidden="true"><ImageDown size={18} /></span>
          <span><strong>生成今天的海报</strong><small>把今天排成一张图</small></span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
