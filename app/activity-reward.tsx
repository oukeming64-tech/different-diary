"use client";

import { Footprints, History, Home as HomeIcon, ShieldCheck } from "lucide-react";

import { formatActivitySummary, type ActivityRecordV1 } from "../lib/stage3";
import "./activity-reward.css";

export type ActivityRewardProps = {
  activity: ActivityRecordV1;
  onHome: () => void;
  onTimeline: () => void;
};

const CONFETTI_PIECES = 10;

export function ActivityReward({
  activity,
  onHome,
  onTimeline,
}: ActivityRewardProps) {
  return (
    <div className="screen saved-screen activity-reward screen-enter motion-saved">
      <div className="activity-reward__celebration" aria-hidden="true">
        <i className="activity-reward__halo activity-reward__halo--one" />
        <i className="activity-reward__halo activity-reward__halo--two" />
        <i className="activity-reward__rays" />
        <span className="activity-reward__core">
          <Footprints size={40} strokeWidth={1.7} />
        </span>
        <span className="activity-reward__confetti">
          {Array.from({ length: CONFETTI_PIECES }, (_, index) => (
            <i key={index} />
          ))}
        </span>
      </div>

      <p className="activity-reward__eyebrow">刚才那一下，算数</p>
      <h2>
        你觉得运动了，
        <br />
        那就是消耗了。
      </h2>
      <p className="activity-reward__summary">{formatActivitySummary(activity)}</p>
      <p className="activity-reward__copy">
        不用等手表点头，也不用先算出一个数字。
        <br />
        你记得自己动过，这一下就算。
      </p>

      <span className="saved-local activity-reward__local">
        <ShieldCheck size={14} aria-hidden="true" />
        运动记录只在这台设备上
      </span>

      <div className="saved-actions activity-reward__actions">
        <button className="primary-button" onClick={onHome} type="button">
          <HomeIcon size={18} aria-hidden="true" />收下这一下
        </button>
        <button className="secondary-button" onClick={onTimeline} type="button">
          <History size={18} aria-hidden="true" />看看最近
        </button>
      </div>
    </div>
  );
}

export default ActivityReward;
