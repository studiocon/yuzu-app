"use client";

import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

type AnimState = "opening" | "open" | "closing";
type Step = "select" | "email-input" | "email-sent";

type Props = {
  open: boolean;
  onClose: () => void;
};

const OPEN_MS = 220;
const CLOSE_MS = 220;

export default function LoginModal({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [animState, setAnimState] = useState<AnimState>("opening");
  const [step, setStep] = useState<Step>("select");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setStep("select");
      setEmail("");
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

  const supabase = createClient();

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : "/auth/callback";

  async function handleApple() {
    setLoading(true);
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo },
    });
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (error) {
      setError("送れなかった。もう一度。");
    } else {
      setStep("email-sent");
    }
  }

  return (
    <div
      className="login-modal"
      data-anim={animState}
      role="dialog"
      aria-modal="true"
      aria-label="ログイン"
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
        {step === "select" && (
          <>
            <h2 className="login-modal-title font-display">SIGN IN.</h2>
            <p className="login-modal-sub">声を刻め。</p>

            <div className="login-modal-actions">
              <button
                className="login-modal-btn login-modal-btn--apple"
                onClick={handleApple}
                disabled={loading}
              >
                <svg width="17" height="20" viewBox="0 0 17 20" fill="none" aria-hidden="true">
                  <path d="M14.04 10.58c-.02-2.1 1.72-3.11 1.8-3.16-.98-1.44-2.51-1.63-3.06-1.65-1.3-.13-2.54.77-3.2.77-.66 0-1.68-.75-2.76-.73-1.42.02-2.73.83-3.46 2.1-1.48 2.57-.38 6.37 1.06 8.45.7 1.02 1.54 2.17 2.64 2.13 1.06-.04 1.46-.69 2.74-.69 1.28 0 1.64.69 2.76.67 1.14-.02 1.87-1.04 2.56-2.06.81-1.18 1.14-2.32 1.16-2.38-.02-.01-2.22-.86-2.24-3.45zM11.9 4.14C12.44 3.47 12.82 2.55 12.72 1.6c-.78.03-1.73.52-2.29 1.18-.5.58-.95 1.52-.83 2.41.87.07 1.76-.44 2.3-1.05z" fill="currentColor"/>
                </svg>
                Apple で続ける
              </button>

              <button
                className="login-modal-btn login-modal-btn--google"
                onClick={handleGoogle}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Google で続ける
              </button>

              <button
                className="login-modal-btn login-modal-btn--email"
                onClick={() => setStep("email-input")}
                disabled={loading}
              >
                メールで続ける
              </button>
            </div>
          </>
        )}

        {step === "email-input" && (
          <>
            <h2 className="login-modal-title font-display">MAIL.</h2>
            <p className="login-modal-sub">アドレスを入れろ。</p>

            <form className="login-modal-email-form" onSubmit={handleEmailSubmit}>
              <input
                className="login-modal-email-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                disabled={loading}
                required
              />
              {error && <p className="login-modal-error">{error}</p>}
              <button
                className="login-modal-btn login-modal-btn--primary"
                type="submit"
                disabled={loading || !email.trim()}
              >
                {loading ? "送信中..." : "送れ"}
              </button>
              <button
                className="login-modal-back"
                type="button"
                onClick={() => { setStep("select"); setError(null); }}
                disabled={loading}
              >
                戻る
              </button>
            </form>
          </>
        )}

        {step === "email-sent" && (
          <>
            <h2 className="login-modal-title font-display">SENT.</h2>
            <p className="login-modal-sub">メールを送った。<br />確認しろ。</p>
            <p className="login-modal-email-hint">{email}</p>
          </>
        )}
      </div>
    </div>
  );
}
