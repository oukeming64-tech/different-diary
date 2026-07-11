import type { ActivityRecordV1, CheckInState, CheckInV1 } from "../stage1";
import { formatActivitySummary } from "../stage3";
import type { TodayPosterModel, TodayPosterMoment } from "./types";

const MAX_POSTER_MOMENTS = 5;

const STATE_LABELS: Record<CheckInState, string> = {
  food: "想吃点东西",
  rest: "今天不想练",
  tired: "刚练完，很累",
  visit: "只是来坐坐",
};

const INTENT_LABELS: Record<CheckInState, Record<string, string>> = {
  food: {
    permission: "听一句：吃也没关系",
    "check-hunger": "想分辨是真的饿，还是太累了",
    "photo-no-calories": "拍下来，但不算热量",
    "loose-range": "想要一个宽松的热量范围",
    "remember-only": "什么也不做，只替我记住",
  },
  rest: {
    "full-rest": "今天就休息",
    entertainment: "玩会儿游戏或看剧",
    walk: "出门走走",
    shopping: "逛逛商场或买点东西",
    "five-minutes": "做五分钟轻松活动",
    "quiet-company": "不想选，只待一会儿",
  },
  tired: {
    rest: "现在只想休息",
    eat: "现在很想吃",
    remember: "顺手记下刚才的运动",
    talk: "想说说此刻的感受",
    "activity-record": "把这次动过记下来",
  },
  visit: {
    "light-word": "听一句轻松的话",
    quiet: "安静待着",
    talk: "其实有一点想说",
    leave: "看一眼就走",
  },
};

function localDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dateLabel(now: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function headlineFor(moments: TodayPosterMoment[]) {
  const tones = new Set(moments.map((moment) => moment.tone));
  if (tones.size > 1) return ["今天，有几种心情。", "都留在这里了。"];
  const tone = moments[0]?.tone;
  if (tone === "food") return ["想吃这件事，", "今天被听见了。"];
  if (tone === "rest") return ["今天，", "给自己留了点空。"];
  if (tone === "tired") return ["今天动过，", "也真的累过。"];
  if (tone === "visit") return ["今天，", "回来坐了一会儿。"];
  return ["今天，", "就这样。"];
}

export function createTodayPosterModel({
  records,
  activities,
  now = new Date(),
}: {
  records: CheckInV1[];
  activities: ActivityRecordV1[];
  now?: Date;
}): TodayPosterModel {
  const todayKey = localDateKey(now);
  const activitiesByCheckIn = new Map(
    activities.map((activity) => [activity.checkInId, activity]),
  );
  const todayRecords = records
    .filter((record) => localDateKey(record.occurredAt) === todayKey)
    .slice()
    .reverse();

  const allMoments = todayRecords.map<TodayPosterMoment>((record) => {
    const activity = activitiesByCheckIn.get(record.id);
    return {
      id: record.id,
      tone: record.state,
      stateLabel: activity ? "今天动过了" : STATE_LABELS[record.state],
      choiceLabel: activity
        ? formatActivitySummary(activity)
        : INTENT_LABELS[record.state]?.[record.intentId] ?? "把这一刻留了下来",
      timeLabel: timeLabel(record.occurredAt),
    };
  });
  const moments = allMoments.slice(0, MAX_POSTER_MOMENTS);

  return {
    dateLabel: dateLabel(now),
    headline: headlineFor(moments),
    moments,
    hiddenCount: Math.max(0, allMoments.length - moments.length),
  };
}
