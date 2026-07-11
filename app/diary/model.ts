import type { CheckInState } from "../../lib/stage1";

export type DiaryView =
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

export type BranchOption = {
  id: string;
  label: string;
};

export type Branch = {
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

export const branches: Branch[] = [
  {
    id: "food",
    icon: "食",
    label: "我想吃点东西",
    shortLabel: "想吃点东西",
    memoryLabel: "那时想吃点东西",
    hint: "先不算，也不劝你忍住",
    eyebrow: "想吃这件事，可以先被听见",
    response: "想吃就可以吃。你不需要先向我证明自己今天表现得很好。",
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
    response: "不想练也可以。上班、通勤和处理生活，本来就在消耗你。",
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

export function branchFor(state: CheckInState | null | undefined) {
  return branches.find((branch) => branch.id === state);
}

export function intentLabel(state: CheckInState, intentId: string) {
  return (
    branchFor(state)?.options.find((option) => option.id === intentId)?.label ??
    "希望被轻轻接住"
  );
}

export function localDateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function groupLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (localDateKey(value) === localDateKey(today.toISOString())) return "今天";
  if (localDateKey(value) === localDateKey(yesterday.toISOString())) return "昨天";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
  }).format(date);
}

export function timeLabel(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function fullDateLabel(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
