"use client";

import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { INQUIRY_SUBJECT_MAX, INQUIRY_BODY_MAX } from "@/lib/inquiries";

type AnimState = "opening" | "open" | "closing";
type Step = "input" | "sent";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultEmail?: string | null;
};

const OPEN_MS = 220;
const CLOSE_MS = 220;

export default function ContactModal({ open, onClose, defaultEmail }: Props) {
  const [mounted, setMounted] = useState(false);
  const [animState, setAnimState] = useState<AnimState>("opening");
  const [step, setStep] = useState<Step>("input");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setStep("input");
      setSubject("");
      setBody("");
      setEmail(defaultEmail ?? "");
      setError(null);
      setAnimState("opening");
      const t = setTimeout(() => setAnimState("open"), OPEN_MS);
      return () => clearTimeout(t);
    } else if (mounted) {
      setAnimState("closing");
      const t = setTimeout(() => setMounted(false), CLOSE_MS);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted) return null;

  const submittable =
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    subject.trim().length <= INQUIRY_SUBJECT_MAX &&
    body.trim().length <= INQUIRY_BODY_MAX;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!submittable || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          email: email.trim() || undefined,
        }),
      });
      if (!res.ok) {
        let code = "";
        try {
          const data = await res.json();
          if (data && typeof data.error === "string") code = data.error;
        } catch { /* noop */ }
        // ユーザーには「次に何をすればよいか」だけを返す。エラーコード/番号は出さない。
        if (res.status === 429 || code === "rate_limited") {
          setError("少し間を置いてからもう一度送ってください。");
        } else if (code === "too_long") {
          setError("文字数が多すぎます。少し削ってからもう一度送ってください。");
        } else if (code === "missing_fields") {
          setError("タイトルと本文を入力してください。");
        } else if (res.status >= 500) {
          setError("いま送信できませんでした。時間を置いてもう一度お試しください。");
        } else {
          setError("送信できませんでした。入力内容を確認してもう一度お試しください。");
        }
        setLoading(false);
        return;
      }
      setStep("sent");
    } catch {
      setError("通信できませんでした。電波の良いところで時間を置いてもう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="login-modal"
      data-anim={animState}
      role="dialog"
      aria-modal="true"
      aria-label="問い合わせ"
    >
      <button
        className="login-modal-close"
        onClick={onClose}
        aria-label="閉じる"
        disabled={loading}
      >
        <X size={20} weight="bold" />
      </button>

      <div className="login-modal-body">
        {step === "input" && (
          <>
            <h2 className="login-modal-title font-display">CONTACT</h2>
            <p className="login-modal-sub">
              改善要望、不具合、感想。<br />
              声を聞かせてくれ。
            </p>

            <form className="login-modal-email-form" onSubmit={handleSubmit}>
              <div className="contact-modal-field">
                <label className="contact-modal-label font-display" htmlFor="contact-subject">
                  タイトル
                </label>
                <input
                  id="contact-subject"
                  className="login-modal-email-input"
                  type="text"
                  placeholder="例: ◯◯がうまく動かない"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={INQUIRY_SUBJECT_MAX}
                  autoFocus
                  disabled={loading}
                  required
                />
              </div>

              <div className="contact-modal-field">
                <label className="contact-modal-label font-display" htmlFor="contact-body">
                  本文
                </label>
                <textarea
                  id="contact-body"
                  className="login-modal-email-input contact-modal-textarea"
                  placeholder="気づいたこと、こうだったらいいのに、を自由に。"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={INQUIRY_BODY_MAX}
                  rows={6}
                  disabled={loading}
                  required
                />
              </div>

              <div className="contact-modal-field">
                <label className="contact-modal-label font-display" htmlFor="contact-email">
                  返信用メールアドレス（任意）
                </label>
                <input
                  id="contact-email"
                  className="login-modal-email-input"
                  type="email"
                  placeholder="返信が必要なら入れてください"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && <p className="login-modal-error">{error}</p>}
              <button
                className="login-modal-btn login-modal-btn--primary"
                type="submit"
                disabled={loading || !submittable}
              >
                {loading ? "送信中..." : "送る"}
              </button>
            </form>
          </>
        )}

        {step === "sent" && (
          <>
            <h2 className="login-modal-title font-display">SENT</h2>
            <p className="login-modal-sub">
              受け取りました。<br />
              必要があれば返信します。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
