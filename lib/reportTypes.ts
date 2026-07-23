import type { PeriodKind } from "./period";

export type ReportPayload = {
  headline: string;
  topics: string[];
  fact: string;
  proof: string;
  shadow: string;
  advice: string;
  adviceDetail: string;
  sentimentSeries: { date: string; score: number }[];
};

export type Report = {
  user_id: string;
  periodKey: string;
  kind: PeriodKind;
  rangeStart: number;
  rangeEnd: number;
  payload: ReportPayload;
  generatedAt: number;
  model: string;
};

export type ReportMeta = {
  periodKey: string;
  kind: PeriodKind;
  rangeStart: number;
  rangeEnd: number;
  label: string;
  generated: boolean;
  headline?: string;
  topics?: string[];
  postCount: number;
  payload?: ReportPayload;
  generatedAt?: number;
  model?: string;
  // Free teaser ゲート（billingEnabled() && plan==="free" の時のみ有効）で対象外になった期間は
  // true。true の場合 headline/topics/payload はレスポンスからは省かれる（見出しリークを防ぐ）。
  locked?: boolean;
};
