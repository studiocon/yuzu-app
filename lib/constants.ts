// プリミティブ定数のみ。依存ゼロ。client / server 両方から import 可能。

/** フリープランの 1 日あたり録音回数上限（PRD §11 / DESIGN.md §12）。
 *  初期リリースはボリューム（＝月次レポート生成コスト・時間）を抑えるため 1 回に制限。 */
export const MAX_DAILY_SESSIONS = 1;

/** 1 録音あたりの最大秒数（ミリ秒）。初期リリースはボリューム抑制のため 1 分に制限。 */
export const MAX_RECORD_MS = 1 * 60 * 1000;

/** PLUS プランの 1 日あたり録音回数上限（#65 Phase B）。 */
export const PLUS_MAX_DAILY_SESSIONS = 3;

/** PLUS プランの 1 録音あたり最大 ms（2 分、#65 Phase B）。 */
export const PLUS_MAX_RECORD_MS = 2 * 60 * 1000;

/** 未ログイン onboarding で許容する STT 呼び出し回数。cookie（改竄可）と
 *  IP ベースの DB カウント（app/api/transcribe/route.ts・supabase/migrations/20260702130000_anon_stt_rate_limit.sql）
 *  の両方に同じ上限を適用する（#52）。 */
export const ANON_DAILY_STT_LIMIT = 1;

/** 1分録音の文字起こしは通常300〜450字。直API叩きによる巨大本文の投入（DB肥大・
 *  レポート生成低速化）を防ぐための上限。 */
export const MAX_RECORD_TEXT = 4000;

/** 1分の m4a は約1MB。余裕を持たせた上限で、巨大ファイルを ElevenLabs へ転送する前に弾く。 */
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/** admin（role=admin）は録音時間無制限だが、メタデータ健全性のための絶対上限（60分）。
 *  lib/entitlements.ts の maxRecordMs=null（無制限）時にサーバがこの値で clamp する。 */
export const ABSOLUTE_MAX_RECORD_MS = 60 * 60 * 1000;
