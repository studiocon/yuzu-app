export type Post = {
  id: string;
  user_id: string;
  text: string;
  createdAt: number;  // Unix ms
  char_count: number;
  durationMs: number; // 録音時間（ms）。総録音分数 STATS の元データ
  index: number;      // 1-based sequential number (computed server-side)
  marked: boolean;    // MARK（刻印）。ユーザーに唯一許された能動操作
};

export type Phase = "idle" | "recording" | "busy" | "complete";
