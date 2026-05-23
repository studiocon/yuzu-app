"use client";

import { useEffect, useState } from "react";
import { CaretRight, SignOut } from "@phosphor-icons/react";
import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/client";

const VERSION = "0.1.0";

export default function SettingsPage() {
  const [nickname, setNicknameState] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? null);
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .maybeSingle();

      const n = profile?.nickname ?? "GUEST";
      setNicknameState(n);
      setDraft(n);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = () => {
    setDraft(nickname);
    setEditing(true);
  };

  const commitEdit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) { setEditing(false); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ nickname: trimmed })
        .eq("id", user.id);
    }
    setNicknameState(trimmed);
    setSaving(false);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditing(false);
  };

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

          {editing ? (
            <div className="settings-row">
              <span className="settings-row-label">NAME</span>
              <input
                className="settings-nickname-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                maxLength={20}
                placeholder="名前をつけろ"
                disabled={saving}
              />
              <button
                type="button"
                className="settings-save-btn font-display"
                onClick={commitEdit}
                disabled={saving}
              >
                {saving ? "..." : "保存"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="settings-row"
              onClick={startEdit}
              aria-label="ニックネームを変更"
            >
              <span className="settings-row-label">NAME</span>
              <span className="settings-row-value">{nickname}</span>
              <CaretRight size={14} className="settings-row-chevron" />
            </button>
          )}
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
          <p className="settings-section-title font-display">PROFILE</p>

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
