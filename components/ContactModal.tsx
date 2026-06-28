"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { useModalAnimation } from "@/lib/useModalAnimation";
import { INQUIRY_SUBJECT_MAX, INQUIRY_BODY_MAX } from "@/lib/inquiries";

type Step = "input" | "sent";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultEmail?: string | null;
};

export default function ContactModal({ open, onClose, defaultEmail }: Props) {
  const [step, setStep] = useState<Step>("input");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mounted, animState } = useModalAnimation(open, {
    onOpen: () => {
      setStep("input");
      setSubject("");
      setBody("");
      setEmail(defaultEmail ?? "");
      setError(null);
    },
  });

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
          setError("立て続けだ。間を置いてもう一度。");
        } else if (code === "too_long") {
          setError("長すぎる。少し削ってもう一度。");
        } else if (code === "missing_fields") {
          setError("タイトルと本文を埋めろ。");
        } else if (res.status >= 500) {
          setError("いま送れなかった。間を置いてもう一度。");
        } else {
          setError("送れなかった。内容を確かめてもう一度。");
        }
        setLoading(false);
        return;
      }
      setStep("sent");
    } catch {
      setError("届かなかった。電波のいい所でもう一度。");
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
                  placeholder="うまくいかない所、ほしい機能。なんでも出せ"
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
                  placeholder="返信がいるなら書け"
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
