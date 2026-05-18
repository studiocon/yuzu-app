export const PROVOCATIVE_TRIGGERS = [
  "長押し。話せ",
  "何が本当なのか？",
  "言ってないことは？",
  "今日、何があった？",
  "本当はどう思ってる？",
  "何から逃げてる？",
  "何に怒ってる？",
  "誰にも言えないことを",
  "整えるな。話せ",
  "1分でいい。出して",
] as const;

export function pickPrompt(): string {
  const i = Math.floor(Math.random() * PROVOCATIVE_TRIGGERS.length);
  return PROVOCATIVE_TRIGGERS[i];
}
