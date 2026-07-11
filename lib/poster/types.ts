import type { CheckInState } from "../stage1";

export type TodayPosterMoment = {
  id: string;
  tone: CheckInState;
  stateLabel: string;
  choiceLabel: string;
  timeLabel: string;
};

export type TodayPosterModel = {
  dateLabel: string;
  headline: string[];
  moments: TodayPosterMoment[];
  hiddenCount: number;
};
