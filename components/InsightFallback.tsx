// INSIGHT 系コンポーネント（WORDS / SIGNAL / PATTERN）の loading / error / empty
// 表示パターンを 1 箇所に集約。className は既存の reports-empty-body を流用。
export default function InsightFallback({
  state,
  message,
}: {
  state: "loading" | "error" | "empty";
  message: string;
}) {
  if (state === "loading") {
    return (
      <p className="reports-empty-body" aria-busy="true">
        {message}
      </p>
    );
  }
  return <p className="reports-empty-body">{message}</p>;
}
