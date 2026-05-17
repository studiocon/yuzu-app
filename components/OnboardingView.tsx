"use client";

import { Microphone } from "@phosphor-icons/react";

type Props = {
  onStart: () => void;
};

export default function OnboardingView({ onStart }: Props) {
  return (
    <section className="onboarding-view">
      <div className="onboarding-copy">
        <p className="onboarding-headline">話せ。</p>
        <p className="onboarding-sub">1 分でいい。声を残せ。</p>
      </div>

      <button
        type="button"
        className="onboarding-mic"
        aria-label="録音を開く"
        onClick={onStart}
      >
        <Microphone size={40} weight="fill" />
      </button>

      <p className="onboarding-hint">長押しで録音</p>
    </section>
  );
}
