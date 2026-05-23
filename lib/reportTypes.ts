import type { PeriodKind } from "./period";

export type ReportPayload = {
  headline: string;
  topics: string[];
  manifest: string;
  latent: string;
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
};
