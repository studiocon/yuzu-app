"use client";

import { Microphone } from "@phosphor-icons/react";

type Props = {
  onStart: () => void;
  pendingText: string | null;
  onSave: () => void;
};

export default function OnboardingView({ onStart, pendingText, onSave }: Props) {
  if (pendingText) {
    return (
      <section className="onboarding-view onboarding-view--preview">
        <p className="onboarding-preview-stamp font-display">CARVED</p>
        <div className="onboarding-preview-card">
          <p className="onboarding-preview-text">{pendingText}</p>
        </div>
        <div className="onboarding-preview-actions">
          <p className="onboarding-guide">残すには、登録しろ</p>
          <button
            type="button"
            className="onboarding-save-btn font-display"
            onClick={onSave}
          >
            刻む
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="onboarding-view">
      <div className="onboarding-copy">
        <p className="onboarding-headline">声を刻め</p>
        <p className="onboarding-sub">長押しで話せ</p>
      </div>

      <button
        type="button"
        className="onboarding-mic"
        aria-label="録音を開く"
        onClick={onStart}
      >
        <Microphone size={40} weight="fill" />
      </button>
    </section>
  );
}
