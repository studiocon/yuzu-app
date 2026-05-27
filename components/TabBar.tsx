"use client";

import { ListNumbers, FileText } from "@phosphor-icons/react";

export type MainTab = "index" | "read";

type Props = {
  tab: MainTab;
  onChange: (tab: MainTab) => void;
  hidden?: boolean;
};

export default function TabBar({ tab, onChange, hidden }: Props) {
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
        <span className="tab-label font-display">LOG</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "read"}
        aria-controls="main-view"
        className="tab-item"
        onClick={() => onChange("read")}
      >
        <FileText size={24} weight={tab === "read" ? "fill" : "regular"} />
        <span className="tab-label font-display">INSIGHT</span>
      </button>
    </nav>
  );
}
