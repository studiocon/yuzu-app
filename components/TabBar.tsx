"use client";

import { Microphone, ListNumbers, FileText } from "@phosphor-icons/react";

export type MainTab = "index" | "report";

type Props = {
  tab: MainTab;
  onChange: (tab: MainTab) => void;
  onOpenRecord: () => void;
  recordOpen?: boolean;
  hidden?: boolean;
};

export default function TabBar({ tab, onChange, onOpenRecord, recordOpen, hidden }: Props) {
  return (
    <nav className="tab-bar" role="tablist" aria-label="メインナビ" data-hidden={hidden ? "true" : undefined}>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "index"}
        aria-controls="main-view"
        className="tab-item"
        onClick={() => onChange("index")}
      >
        <ListNumbers size={24} weight={tab === "index" ? "fill" : "regular"} />
        <span className="tab-label font-display">INDEX</span>
      </button>
      <button
        type="button"
        className="tab-item tab-item--center mic-fab"
        aria-label="録音を開く"
        aria-haspopup="dialog"
        aria-expanded={recordOpen ?? false}
        onClick={onOpenRecord}
      >
        <Microphone size={28} weight="fill" />
        <span className="tab-label font-display">TALK</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "report"}
        aria-controls="main-view"
        className="tab-item"
        onClick={() => onChange("report")}
      >
        <FileText size={24} weight={tab === "report" ? "fill" : "regular"} />
        <span className="tab-label font-display">REPORT</span>
      </button>
    </nav>
  );
}
