// INSIGHT 系コンポーネント（WORDS / SIGNAL / PATTERN）の error / empty
// 表示パターンを 1 箇所に集約。className は既存の reports-empty-body を流用。
export default function InsightFallback({
  state,
  message,
}: {
  state: "error" | "empty";
  message: string;
}) {
  return <p className="reports-empty-body">{message}</p>;
}
