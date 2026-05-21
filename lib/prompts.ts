export const PROVOCATIVE_TRIGGERS = [
  "何が本当だ？",
  "言ってないことは？",
  "今日、誰に嘘をついた？",
  "本当はどう思った？",
  "逃げてることは？",
  "怒ってるのは何にだ？",
  "誰にも言えないことを。",
  "整えるな。話せ。",
  "1分でいい。出せ。",
  "黙ってる場合か？",
] as const;

export function pickPrompt(): string {
  const i = Math.floor(Math.random() * PROVOCATIVE_TRIGGERS.length);
  return PROVOCATIVE_TRIGGERS[i];
}
