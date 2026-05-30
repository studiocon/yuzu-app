"use client";

import { useEffect, useState } from "react";
import { CaretRight, SignOut, Trash } from "@phosphor-icons/react";
import PageHeader from "@/components/PageHeader";
import DeleteAccountModal from "@/components/DeleteAccountModal";
import { createClient } from "@/lib/supabase/client";
import { isMockMode } from "@/lib/mockReports";
import { SENTIMENT_CACHE_KEY } from "@/lib/userClient";

const MAJOR_MINOR = "0.1";
const BUILD = process.env.NEXT_PUBLIC_BUILD_NUMBER ?? "0";
const VERSION = `${MAJOR_MINOR}.${BUILD}`;

export default function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mock, setMock] = useState(false);

  const supabase = createClient();

  useEffect(() => { setMock(isMockMode()); }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? null);
      setUserId(user.id);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const clearLocalCaches = () => {
    try {
      localStorage.removeItem(SENTIMENT_CACHE_KEY);
      localStorage.removeItem("yuzu-daily-sessions");
      sessionStorage.removeItem("yuzu_pending_text");
    } catch { /* storage 不可環境は無視 */ }
  };

  const handleDeleteAccount = async () => {
    // mock-mode は実セッションが無いため API を叩かず擬似削除。mock を抜けて / へ。
    if (mock) {
      try {
        sessionStorage.removeItem("yuzu-mock-mode");
        document.cookie = "yuzu-mock-mode=; path=/; Max-Age=0; SameSite=Lax";
      } catch { /* 無視 */ }
      clearLocalCaches();
      window.location.href = "/";
      return;
    }
    const res = await fetch("/api/account", { method: "DELETE" });
    if (!res.ok) {
      // 呼び出し元（モーダル）でエラー表示するため throw
      throw new Error(`delete failed: ${res.status}`);
    }
    await supabase.auth.signOut();
    clearLocalCaches();
    window.location.href = "/";
  };

  const shortId = userId ? userId.slice(0, 8) + "..." : "―";
  const displayEmail = email ?? "―";

  return (
    <main className="settings-page">
      <PageHeader title="SETTINGS" backHref="/" />

      <div className="settings-body">
        <section className="settings-section">
          <p className="settings-section-title font-display">YOU</p>

          <div className="settings-row settings-row--disabled" aria-disabled="true">
            <span className="settings-row-label">プラン</span>
            <span className="settings-row-value">フリープラン</span>
            <CaretRight size={14} className="settings-row-chevron" />
          </div>
        </section>

        <section className="settings-section">
          <p className="settings-section-title font-display">ALERT</p>

          <div className="settings-row settings-row--disabled" aria-disabled="true">
            <span className="settings-row-label">メール通知</span>
            <span className="settings-row-value">―</span>
          </div>

          <div className="settings-row settings-row--disabled" aria-disabled="true">
            <span className="settings-row-label">プッシュ通知</span>
            <span className="settings-row-value">―</span>
          </div>
        </section>

        <section className="settings-section">
          <p className="settings-section-title font-display">ACCOUNT</p>

          <div className="settings-row settings-row--disabled" aria-disabled="true">
            <span className="settings-row-label">メールアドレス</span>
            <span className="settings-row-value">{displayEmail}</span>
          </div>

          <div className="settings-row settings-row--disabled" aria-disabled="true">
            <span className="settings-row-label">ユーザーID</span>
            <span className="settings-row-value settings-row-value--mono">{shortId}</span>
          </div>
        </section>

        <section className="settings-section">
          <p className="settings-section-title font-display">LEGAL</p>

          <div className="settings-row settings-row--disabled" aria-disabled="true">
            <span className="settings-row-label">利用規約</span>
            <CaretRight size={14} className="settings-row-chevron" />
          </div>

          <div className="settings-row settings-row--disabled" aria-disabled="true">
            <span className="settings-row-label">プライバシーポリシー</span>
            <CaretRight size={14} className="settings-row-chevron" />
          </div>
        </section>

        <section className="settings-section">
          <button
            type="button"
            className="settings-row settings-row--danger"
            onClick={handleSignOut}
          >
            <SignOut size={16} weight="bold" />
            <span className="settings-row-label">ログアウト</span>
          </button>

          <button
            type="button"
            className="settings-row settings-row--danger"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash size={16} weight="bold" />
            <span className="settings-row-label">アカウントを削除</span>
          </button>
        </section>
      </div>

      <p className="settings-version font-display">VERSION {VERSION}</p>

      <DeleteAccountModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
      />
    </main>
  );
}
