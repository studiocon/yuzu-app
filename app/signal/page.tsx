"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import {
  clearUnread,
  getLastReadAt,
  listNotifications,
  type NotifItem,
} from "@/lib/notifications";

function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function SignalPage() {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [lastReadAt, setLastReadAt] = useState<number>(() =>
    typeof window === "undefined" ? 0 : getLastReadAt(),
  );

  useEffect(() => {
    setItems(listNotifications());
    clearUnread();
  }, []);

  const handleClearAll = () => {
    setLastReadAt(clearUnread());
  };

  return (
    <main className="signal-page">
      <PageHeader title="SIGNAL" backHref="/" />

      <div className="signal-body">
        {items.length === 0 ? (
          <p className="signal-empty">何も無い。</p>
        ) : (
          <ul className="signal-list">
            {items.map((n) => {
              const isNew = n.createdAt > lastReadAt;
              return (
                <li key={n.id} className="signal-item">
                  <Link href={`/signal/${n.id}`} className="signal-item-link">
                    <span className="signal-item-date font-display">{formatDate(n.createdAt)}</span>
                    <span className="signal-item-body">{n.body}</span>
                    {isNew && <span className="signal-new-badge font-display">NEW</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {items.length > 0 && (
          <div className="signal-actions">
            <button type="button" className="btn btn--secondary" onClick={handleClearAll}>
              CLEAR ALL.
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
