"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { getNotification, type NotifItem } from "@/lib/notifications";

function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function SignalDetailPage({ params }: { params: { notifId: string } }) {
  const [item, setItem] = useState<NotifItem | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    setItem(getNotification(params.notifId));
    setResolved(true);
  }, [params.notifId]);

  return (
    <main className="signal-page">
      <PageHeader title="SIGNAL" backHref="/signal" />

      <div className="signal-detail">
        {!resolved ? null : !item ? (
          <p className="signal-empty">何も無い。</p>
        ) : (
          <>
            <p className="signal-detail-date font-display">{formatDate(item.createdAt)}</p>
            <h2 className="signal-detail-title font-display">{item.title}</h2>
            <p className="signal-detail-body">{item.body}</p>
          </>
        )}
      </div>
    </main>
  );
}
