"use client";

import { useEffect, useState } from "react";
import ReportCard from "@/components/ReportCard";
import PageHeader from "@/components/PageHeader";
import type { ReportMeta } from "@/lib/reportTypes";
import { buildMockReportMetas, isMockMode } from "@/lib/mockReports";

export default function ReportsIndexPage() {
  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isMockMode()) {
      setReports(buildMockReportMetas());
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/reports?scope=all", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) { setReports([]); setError(null); }
          return;
        }
        const data = (await res.json()) as { reports?: ReportMeta[] };
        if (cancelled) return;
        setReports(Array.isArray(data.reports) ? data.reports : []);
      } catch {
        if (!cancelled) setError("失敗。もう一度。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="reports-index-page">
      <PageHeader title="REPORTS" backHref="/" />

      {loading && <p className="reports-empty">DECODING…</p>}
      {!loading && reports.length === 0 && !error && (
        <p className="reports-empty">まだ無い。話せ。</p>
      )}
      {error && <p className="reports-empty">{error}</p>}

      <div className="reports-index-list">
        {reports.map((meta) => (
          <ReportCard key={meta.periodKey} meta={meta} />
        ))}
      </div>
    </main>
  );
}
