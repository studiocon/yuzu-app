"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { X, Copy, PushPin, PushPinSlash } from "@phosphor-icons/react";
import type { Post } from "@/lib/types";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { useCountUp } from "@/lib/useCountUp";
import { WEEKDAY_JA } from "@/lib/streak";
import { formatDuration, dayNumberSince } from "@/lib/stats";
import { sentimentColor } from "@/lib/sentimentColor";
import { seededHeights, voiceprintBarCount } from "@/lib/voiceprint";
import { recordWords, splitHighlights } from "@/lib/highlightWords";

type AnimState = "opening" | "open" | "closing";

const OPEN_MS = 280;
const CLOSE_MS = 220;

type Props = {
  post: Post | null;
  /** 最初の投稿時刻。DAY（登録から何日目か）の算出に使う。未取得なら DAY は出さない。 */
  firstPostAt?: number | null;
  /** 感情スコア（-1.0〜1.0）。声紋ヒーロー / 見出し帯左端バーの着色に使う。未解析なら無色（graceful）。 */
  score?: number;
  /** WORDS（INSIGHT の頻出語トップ20。全 RECORD 横断）。本文ハイライトをこの語に絞る。未配線時は記録単体の内容語抽出にフォールバック。 */
  topWords?: Set<string>;
  onToggleMark?: (post: Post, next: boolean) => void;
  onClose: () => void;
};

const formatStamp = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  const wd = WEEKDAY_JA[d.getDay()];
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${wd}) ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatTimestamp = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// 「。」直後で段落に割る（句点は残す）。明示改行は段落内で pre-wrap に委ねる。
const splitParagraphs = (text: string): string[] => {
  const parts = text
    .split(/(?<=。)\s*\n?/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts : [text];
};

export default function IndexDetailModal({ post, firstPostAt, score, topWords, onToggleMark, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [animState, setAnimState] = useState<AnimState>("opening");
  // モーダルは detailPost のスナップショットを保持するので marked はローカルで持つ。
  const [marked, setMarked] = useState(false);
  const [justMarked, setJustMarked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (post) setMarked(post.marked);
  }, [post]);

  useEffect(() => {
    if (post) {
      setMounted(true);
      setAnimState("opening");
      const t = setTimeout(() => setAnimState("open"), 20);
      return () => clearTimeout(t);
    } else if (mounted) {
      setAnimState("closing");
      const t = setTimeout(() => setMounted(false), CLOSE_MS);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post]);

  useBodyScrollLock(mounted);

  // onClose は親の inline arrow なので毎 render 参照が変わる。
  // effect deps に含めると Strict Mode / 親再 render で cleanup が走り、
  // popstate effect の history.back() が誤発火 → モーダル即閉じの原因になる。
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted]);

  // 戻るボタンで閉じる UX を提供する。
  // - pushedRef で pushState の冪等性を担保（Strict Mode 二重 mount 対策）
  // - userBackedRef で「ユーザの戻る操作」と「自前 history.back()」を区別し
  //   閉じる時に二重 back を防ぐ
  const pushedRef = useRef(false);
  const userBackedRef = useRef(false);
  useEffect(() => {
    if (!mounted) {
      if (pushedRef.current && !userBackedRef.current && window.history.state?.indexDetail) {
        window.history.back();
      }
      pushedRef.current = false;
      userBackedRef.current = false;
      return;
    }
    if (!pushedRef.current) {
      window.history.pushState({ indexDetail: true }, "");
      pushedRef.current = true;
    }
    const onPop = () => {
      userBackedRef.current = true;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [mounted]);

  // フック規則：早期 return より前で必ず呼ぶ（post=null 時は安全な既定値で空回し）。
  const charsUp = useCountUp(post?.char_count ?? 0, { delayMs: 200 });
  const bars = useMemo(() => {
    const count = voiceprintBarCount(post?.durationMs ?? 0);
    return count === null ? null : seededHeights(post?.id ?? "", count);
  }, [post?.id, post?.durationMs]);
  const words = useMemo(() => recordWords(post?.text ?? "", topWords), [post?.text, topWords]);

  if (!mounted || !post) return null;

  // その1件の RECORD の「事実」だけを刻む。算出不能な項目はカードごと出さない。
  const lengthLabel = post.durationMs > 0 ? formatDuration(post.durationMs) : null;
  const dayNumber =
    typeof firstPostAt === "number" ? dayNumberSince(post.createdAt, firstPostAt) : 0;
  const dayLabel = dayNumber > 0 ? String(dayNumber) : null;
  const charsLabel = post.char_count > 0 ? String(charsUp) : null;
  const hasStats = lengthLabel !== null || dayLabel !== null || charsLabel !== null;
  const paragraphs = splitParagraphs(post.text);

  // 声紋ヒーロー / 見出し帯の感情色。未解析（score=undefined）なら null で graceful に無色化。
  const moodColor = sentimentColor(score);

  const fireMark = () => {
    if (!onToggleMark) return;
    const next = !marked;
    setMarked(next);
    onToggleMark(post, next);
    if (next) {
      setJustMarked(true);
      setTimeout(() => setJustMarked(false), 900);
    }
  };

  // TEMPORARY: Notion移行期間限定のコピー機能。
  // 削除トリガー: オーナー（こんちゃん）が Notion 併用を止めたタイミング。
  // 詳細は PRD.md "COPY（一時機能 / ⚠️ 将来削除予定）" 節を参照。
  const handleCopy = async () => {
    const payload = `#${String(post.index).padStart(3, "0")}  ${formatTimestamp(post.createdAt)}\n${post.text}`;
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        ok = true;
      }
    } catch {}
    if (!ok) {
      try {
        const ta = document.createElement("textarea");
        ta.value = payload;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {}
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    }
  };

  return (
    <div
      className="index-detail-modal"
      data-anim={animState}
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button
        type="button"
        className="index-detail-close"
        aria-label="閉じる"
        onClick={onClose}
      >
        <X size={22} weight="bold" />
      </button>

      <div className="index-detail-body">
        <div className="index-detail-band">
          {moodColor && (
            <span className="index-detail-band-edge" style={{ background: moodColor }} aria-hidden />
          )}
          <p className="index-detail-num font-display">#{post.index}</p>
          {bars && (
            <div className="index-detail-voiceprint" aria-hidden>
              {bars.map((h, i) => (
                <span
                  key={i}
                  className="index-detail-voiceprint-bar"
                  style={{
                    height: `${Math.round(h * 100)}%`,
                    background: moodColor ?? "rgba(255,255,255,0.4)",
                    ["--vp-delay" as string]: `${i * 18}ms`,
                  } as CSSProperties}
                />
              ))}
            </div>
          )}
          <p className="index-detail-stamp font-display">{formatStamp(post.createdAt)}</p>
        </div>

        {hasStats && (
          <div className="index-detail-stats">
            {lengthLabel !== null && (
              <div className="index-detail-stat-card">
                <span className="index-detail-stat-label font-display">LENGTH</span>
                <span className="index-detail-stat-value font-display">{lengthLabel}</span>
              </div>
            )}
            {dayLabel !== null && (
              <div className="index-detail-stat-card">
                <span className="index-detail-stat-label font-display">DAY</span>
                <span className="index-detail-stat-value font-display">{dayLabel}</span>
              </div>
            )}
            {charsLabel !== null && (
              <div className="index-detail-stat-card">
                <span className="index-detail-stat-label font-display">CHARS</span>
                <span className="index-detail-stat-value font-display">{charsLabel}</span>
              </div>
            )}
          </div>
        )}

        <div className="index-detail-text">
          {paragraphs.map((para, i) => (
            <p
              key={i}
              className="index-detail-para"
              style={{ ["--reveal-delay" as string]: `${i * 60}ms` } as CSSProperties}
            >
              {splitHighlights(para, words).map((seg, j) =>
                seg.mark
                  ? <mark key={j} className="record-mark">{seg.text}</mark>
                  : <span key={j}>{seg.text}</span>,
              )}
            </p>
          ))}
        </div>

        <div className="index-detail-actions">
          {onToggleMark && (
            <button
              type="button"
              className={"index-detail-actionbtn" + (marked ? " is-marked" : "")}
              onClick={fireMark}
              aria-label={marked ? "MARK を外す" : "MARK する"}
              aria-pressed={marked}
              title={marked ? "MARKED" : "MARK"}
            >
              {marked
                ? <PushPin size={18} weight="fill" />
                : <PushPinSlash size={18} weight="regular" />}
              <span className="index-detail-actionlabel font-display">{justMarked ? "MARKED" : "MARK"}</span>
            </button>
          )}
          {/* TEMPORARY: Notion移行期間限定のコピー機能。YUZU運用が完全移行したら削除する。 */}
          <button
            type="button"
            className={"index-detail-actionbtn" + (copied ? " is-copied" : "")}
            onClick={handleCopy}
            aria-label={copied ? "COPIED" : "本文をコピー"}
            title={copied ? "COPIED" : "COPY"}
          >
            <Copy size={18} weight="regular" />
            <span className="index-detail-actionlabel font-display">{copied ? "COPIED" : "COPY"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
