export type Post = {
  id: string;
  user_id: string;
  text: string;
  createdAt: number;  // Unix ms
  char_count: number;
  index: number;      // 1-based sequential number (computed server-side)
};

export type Phase = "idle" | "recording" | "busy" | "complete";
