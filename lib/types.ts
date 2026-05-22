export type Post = {
  id: string;
  text: string;
  createdAt: number;
  emoji: string;
  sessionId: string;
  index: number;
};

export type Phase = "idle" | "recording" | "busy" | "complete";
