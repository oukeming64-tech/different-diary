"use client";

import { ArrowLeft, Check, Footprints } from "lucide-react";
import { useState, type FormEvent } from "react";

import {
  ACTIVITY_CATEGORY_LABELS,
  type ActivityCategory,
  type CreateActivityRecordInput,
} from "../lib/stage3";
import "./activity-flow.css";

const CATEGORY_OPTIONS: ActivityCategory[] = [
  "walking",
  "running",
  "strength",
  "cycling",
  "swimming",
  "ball",
  "stretching",
  "other",
];

type ActivityDraft = Omit<CreateActivityRecordInput, "localUserId">;

export type ActivityFlowProps = {
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (draft: ActivityDraft) => Promise<void>;
};

function optionalNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

export function ActivityFlow({
  busy,
  error,
  onCancel,
  onSave,
}: ActivityFlowProps) {
  const [category, setCategory] = useState<ActivityCategory | null>(null);
  const [customLabel, setCustomLabel] = useState("");
  const [duration, setDuration] = useState("");
  const [steps, setSteps] = useState("");
  const [distance, setDistance] = useState("");
  const [note, setNote] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({
      category: category ?? "unspecified",
      customLabel: category === "other" ? customLabel : null,
      durationMinutes: optionalNumber(duration),
      steps: optionalNumber(steps),
      distanceKm: optionalNumber(distance),
      note,
    });
  }

  return (
    <div className="screen activity-screen screen-enter motion-activity">
      <header className="activity-backbar">
        <button className="back-button" disabled={busy} onClick={onCancel} type="button">
          <ArrowLeft aria-hidden="true" size={18} />返回
        </button>
        <span>每一项都能跳过</span>
      </header>

      <form className="activity-form" onSubmit={submit}>
        <header className="activity-heading">
          <span className="activity-mark" aria-hidden="true">
            <Footprints size={22} strokeWidth={1.7} />
          </span>
          <p>运动记录</p>
          <h2>刚才动了动</h2>
          <span>想记多少，就记多少。这里不算完成度。</span>
        </header>

        <fieldset className="activity-fieldset">
          <legend>做了什么</legend>
          <p>不想分类也可以直接往下。</p>
          <div className="activity-categories">
            {CATEGORY_OPTIONS.map((option) => (
              <button
                aria-pressed={category === option}
                className={category === option ? "is-selected" : undefined}
                disabled={busy}
                key={option}
                onClick={() => setCategory(category === option ? null : option)}
                type="button"
              >
                {ACTIVITY_CATEGORY_LABELS[option]}
              </button>
            ))}
          </div>
          {category === "other" && (
            <label className="activity-custom-label">
              <span>想怎么叫它</span>
              <input
                disabled={busy}
                maxLength={40}
                onChange={(event) => setCustomLabel(event.target.value)}
                placeholder="比如：爬山、跳舞"
                value={customLabel}
              />
            </label>
          )}
        </fieldset>

        <fieldset className="activity-fieldset activity-numbers">
          <legend>想留下的数字</legend>
          <p>不填也没关系，数字不会被换算成好坏。</p>
          <div className="activity-number-grid">
            <label>
              <span>时长</span>
              <span className="activity-input-with-unit">
                <input
                  disabled={busy}
                  inputMode="numeric"
                  max="1440"
                  min="1"
                  onChange={(event) => setDuration(event.target.value)}
                  placeholder="—"
                  step="1"
                  type="number"
                  value={duration}
                />
                <small>分钟</small>
              </span>
            </label>
            <label>
              <span>步数</span>
              <span className="activity-input-with-unit">
                <input
                  disabled={busy}
                  inputMode="numeric"
                  max="200000"
                  min="1"
                  onChange={(event) => setSteps(event.target.value)}
                  placeholder="—"
                  step="1"
                  type="number"
                  value={steps}
                />
                <small>步</small>
              </span>
            </label>
            <label>
              <span>距离</span>
              <span className="activity-input-with-unit">
                <input
                  disabled={busy}
                  inputMode="decimal"
                  max="1000"
                  min="0.01"
                  onChange={(event) => setDistance(event.target.value)}
                  placeholder="—"
                  step="0.01"
                  type="number"
                  value={distance}
                />
                <small>公里</small>
              </span>
            </label>
          </div>
        </fieldset>

        <label className="activity-note">
          <span>还想留一句 <small>可不填</small></span>
          <textarea
            disabled={busy}
            maxLength={1000}
            onChange={(event) => setNote(event.target.value)}
            placeholder="比如：下班后随便走了一圈"
            value={note}
          />
        </label>

        {error && <p className="activity-error" role="alert">{error}</p>}

        <div className="activity-actions">
          <button className="primary-button" disabled={busy} type="submit">
            <Check aria-hidden="true" size={18} />
            {busy ? "正在记下…" : "记在本机"}
          </button>
          <button className="secondary-button" disabled={busy} onClick={onCancel} type="button">
            这次不记
          </button>
        </div>
      </form>
    </div>
  );
}

export default ActivityFlow;
