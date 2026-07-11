import type { ActivityCategory, ActivityRecordV1 } from "../stage1";

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  walking: "走路",
  running: "跑步",
  strength: "力量训练",
  cycling: "骑行",
  swimming: "游泳",
  ball: "球类",
  stretching: "拉伸或瑜伽",
  other: "其他",
  unspecified: "没分类",
};

export function activityCategoryLabel(
  activity: Pick<ActivityRecordV1, "category" | "customLabel">,
): string {
  return activity.customLabel || ACTIVITY_CATEGORY_LABELS[activity.category];
}

export function formatActivitySummary(
  activity: Pick<
    ActivityRecordV1,
    | "category"
    | "customLabel"
    | "durationMinutes"
    | "steps"
    | "distanceKm"
  >,
): string {
  const details = [
    activity.category === "unspecified" && !activity.customLabel
      ? null
      : activityCategoryLabel(activity),
    activity.durationMinutes ? `${activity.durationMinutes} 分钟` : null,
    activity.steps ? `${activity.steps.toLocaleString("zh-CN")} 步` : null,
    activity.distanceKm ? `${activity.distanceKm.toLocaleString("zh-CN")} 公里` : null,
  ].filter(Boolean);

  return details.length ? details.join(" · ") : "动过了";
}
