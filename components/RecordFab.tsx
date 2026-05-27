"use client";

import { Microphone } from "@phosphor-icons/react";

type Props = {
  onOpen: () => void;
  recordOpen?: boolean;
  hidden?: boolean;
};

export default function RecordFab({ onOpen, recordOpen, hidden }: Props) {
  return (
    <button
      type="button"
      className="fab-record"
      aria-label="録音を開く"
      aria-haspopup="dialog"
      aria-expanded={recordOpen ?? false}
      data-hidden={hidden ? "true" : undefined}
      onClick={onOpen}
    >
      <Microphone size={28} weight="fill" />
    </button>
  );
}
