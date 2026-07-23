// Free プランのレポート teaser ゲート（billingEnabled() && plan==="free" のときのみ有効。
// lib/entitlements.ts の canUseAllReports 参照）。ユーザーが最初に生成したレポート
// （oldestPeriodKey、reports.generated_at 最古）だけを永続的に無料開放し、それ以外は
// plan_required の対象にする。DB 非依存の純粋関数（テスト容易性のため lib/reports.ts から分離）。
export function isReportPeriodAccessible(params: {
  canUseAllReports: boolean;
  periodKey: string;
  oldestPeriodKey: string | null; // ユーザーがまだ1件もレポートを生成していなければ null
}): boolean {
  const { canUseAllReports, periodKey, oldestPeriodKey } = params;
  if (canUseAllReports) return true;
  if (oldestPeriodKey === null) return true; // teaser 対象がまだ確定していない（初回生成前）
  return periodKey === oldestPeriodKey;
}
