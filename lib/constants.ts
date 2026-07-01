// プリミティブ定数のみ。依存ゼロ。client / server 両方から import 可能。

/** フリープランの 1 日あたり録音回数上限（PRD §11 / DESIGN.md §12）。
 *  初期リリースはボリューム（＝月次レポート生成コスト・時間）を抑えるため 1 回に制限。 */
export const MAX_DAILY_SESSIONS = 1;

/** 1 録音あたりの最大秒数（ミリ秒）。初期リリースはボリューム抑制のため 1 分に制限。 */
export const MAX_RECORD_MS = 1 * 60 * 1000;

/** 未ログイン onboarding で許容する STT 呼び出し回数（cookie ベース・cookie 改竄前提の弱保護）。
 *  厳密化は GitHub issue #52 で対応予定。 */
export const ANON_DAILY_STT_LIMIT = 1;
