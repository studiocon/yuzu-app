"use client";

import { useEffect, useState } from "react";
import { CaretRight } from "@phosphor-icons/react";
import PageHeader from "@/components/PageHeader";
import { getNickname, setNickname as persistNickname } from "@/lib/userClient";

const VERSION = "0.1.0";

export default function SettingsPage() {
  const [nickname, setNicknameState] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const n = getNickname("🍑");
    setNicknameState(n);
    setDraft(n);
  }, []);

  const startEdit = () => {
    setDraft(nickname);
    setEditing(true);
  };

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      persistNickname(trimmed);
      setNicknameState(trimmed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditing(false);
  };

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

          <div className="settings-row" onClick={!editing ? startEdit : undefined} style={{ cursor: editing ? "default" : "pointer" }}>
            <span className="settings-row-label">NAME</span>
            {editing ? (
              <>
                <input
                  className="settings-nickname-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  maxLength={20}
                  placeholder="名前をつけよう"
                />
                <button
                  type="button"
                  className="settings-save-btn font-display"
                  onClick={(e) => { e.stopPropagation(); commitEdit(); }}
                >
                  保存
                </button>
              </>
            ) : (
              <>
                <span className="settings-row-value">{nickname}</span>
                <CaretRight size={14} className="settings-row-chevron" />
              </>
            )}
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
          <p className="settings-section-title font-display">PROFILE</p>

          <div className="settings-row settings-row--disabled" aria-disabled="true">
            <span className="settings-row-label">メールアドレス</span>
            <span className="settings-row-value">―</span>
          </div>

          <div className="settings-row settings-row--disabled" aria-disabled="true">
            <span className="settings-row-label">ユーザーID</span>
            <span className="settings-row-value">―</span>
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
      </div>

      <p className="settings-version font-display">VERSION {VERSION}</p>
    </main>
  );
}
