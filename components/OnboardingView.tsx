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
        <div className="onboarding-preview-card">
          <p className="onboarding-preview-label font-display">DECODED.</p>
          <p className="onboarding-preview-text">{pendingText}</p>
        </div>
        <div className="onboarding-preview-actions">
          <button
            type="button"
            className="onboarding-save-btn font-display"
            onClick={onSave}
          >
            記録する
          </button>
          <button
            type="button"
            className="onboarding-redo-btn"
            onClick={onStart}
          >
            もう一度
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="onboarding-view">
      <div className="onboarding-copy">
        <p className="onboarding-headline">話せ</p>
        <p className="onboarding-sub">まずは、長押しして声を残せ</p>
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
