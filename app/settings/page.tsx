"use client";

import { useEffect, useState } from "react";
import { CaretRight, SignOut } from "@phosphor-icons/react";
import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/client";

const MAJOR_MINOR = "0.1";
const BUILD = process.env.NEXT_PUBLIC_BUILD_NUMBER ?? "0";
const VERSION = `${MAJOR_MINOR}.${BUILD}`;

export default function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

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
        </section>
      </div>

      <p className="settings-version font-display">VERSION {VERSION}</p>
    </main>
  );
}
