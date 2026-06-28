"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { useModalAnimation } from "@/lib/useModalAnimation";

type Step = "list" | "created";

type TokenItem = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: number;
  lastUsedAt: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

const NAME_MAX = 40;

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

export default function ApiTokenModal({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>("list");
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [newTokenName, setNewTokenName] = useState("");
  const [justIssued, setJustIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mounted, animState } = useModalAnimation(open, {
    onOpen: () => {
      setStep("list");
      setNewTokenName("");
      setJustIssued(null);
      setCopied(false);
      setError(null);
      loadTokens();
    },
  });

  if (!mounted) return null;

  async function loadTokens() {
    setLoadingList(true);
    try {
      const res = await fetch("/api/account/tokens");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTokens(Array.isArray(data.tokens) ? data.tokens : []);
    } catch {
      setError("読み込めなかった。もう一度。");
    } finally {
      setLoadingList(false);
    }
  }

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    if (issuing) return;
    setIssuing(true);
    setError(null);
    try {
      const res = await fetch("/api/account/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTokenName.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTokens((prev) => [
        { id: data.id, name: data.name, tokenPrefix: data.tokenPrefix, createdAt: data.createdAt, lastUsedAt: data.lastUsedAt },
        ...prev,
      ]);
      setJustIssued(data.token);
      setNewTokenName("");
      setStep("created");
    } catch {
      setError("発行できなかった。もう一度。");
    } finally {
      setIssuing(false);
    }
  }

  async function handleRevoke(id: string) {
    setRevokingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/account/tokens?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTokens((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError("削除できなかった。もう一度。");
    } finally {
      setRevokingId(null);
    }
  }

  async function handleCopy() {
    if (!justIssued) return;
    try {
      await navigator.clipboard.writeText(justIssued);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = justIssued;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="login-modal"
      data-anim={animState}
      role="dialog"
      aria-modal="true"
      aria-label="API トークン"
    >
      <button
        className="login-modal-close"
        onClick={onClose}
        aria-label="閉じる"
        disabled={issuing}
      >
        <X size={20} weight="bold" />
      </button>

      <div className="login-modal-body">
        {step === "list" && (
          <>
            <h2 className="login-modal-title font-display">CONNECT</h2>
            <p className="login-modal-sub">
              トークンを渡せば、外部の AI から記録を読める。<br />
              漏れたら声が読まれる。人に見せるな。
            </p>

            {loadingList ? (
              <p className="token-modal-empty">読み込み中…</p>
            ) : tokens.length === 0 ? (
              <p className="token-modal-empty">トークンは無い</p>
            ) : (
              <ul className="token-modal-list">
                {tokens.map((t) => (
                  <li key={t.id} className="token-modal-item">
                    <div className="token-modal-item-main">
                      <span className="token-modal-item-name">{t.name}</span>
                      <span className="token-modal-item-prefix">{t.tokenPrefix}…</span>
                    </div>
                    <div className="token-modal-item-meta">
                      <span>{formatDate(t.createdAt)} 発行</span>
                      <span>{t.lastUsedAt ? `${formatDate(t.lastUsedAt)} 使用` : "未使用"}</span>
                    </div>
                    <button
                      type="button"
                      className="token-modal-revoke"
                      onClick={() => handleRevoke(t.id)}
                      disabled={revokingId === t.id}
                    >
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form className="login-modal-email-form" onSubmit={handleIssue}>
              <div className="contact-modal-field">
                <label className="contact-modal-label font-display" htmlFor="token-name">
                  名前（任意）
                </label>
                <input
                  id="token-name"
                  className="login-modal-email-input"
                  type="text"
                  placeholder="MCP"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  maxLength={NAME_MAX}
                  disabled={issuing}
                />
              </div>

              {error && <p className="login-modal-error">{error}</p>}

              <button
                className="login-modal-btn login-modal-btn--primary"
                type="submit"
                disabled={issuing}
              >
                {issuing ? "発行中…" : "トークンを発行"}
              </button>
            </form>
          </>
        )}

        {step === "created" && justIssued && (
          <>
            <h2 className="login-modal-title font-display">ISSUED</h2>
            <p className="login-modal-sub">
              今だけ表示する。コピーしろ。<br />
              閉じたら二度と見れない。
            </p>

            <div className="token-modal-secret">
              <span className="token-modal-secret-value">{justIssued}</span>
            </div>

            <button
              type="button"
              className="login-modal-btn login-modal-btn--primary"
              onClick={handleCopy}
            >
              {copied ? "COPIED" : "コピー"}
            </button>

            <button
              type="button"
              className="login-modal-back"
              onClick={() => setStep("list")}
            >
              一覧へ戻る
            </button>
          </>
        )}
      </div>
    </div>
  );
}
