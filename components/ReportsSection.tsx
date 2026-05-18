"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import ReportCard from "./ReportCard";
import type { ReportMeta } from "@/lib/reportTypes";
import { buildMockReportMetas, isMockMode } from "@/lib/mockReports";

type Props = {
  mySessionId: string | null;
};

export default function ReportsSection({ mySessionId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (isMockMode()) {
      setReports(buildMockReportMetas());
      setLoading(false);
      setError(null);
      return;
    }
    if (!mySessionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch("/api/reports", { cache: "no-store" });
        if (!res.ok) {
          // KV 未設定や初期状態は空表示にとどめる
          if (!cancelled) setReports([]);
          return;
        }
        const data = (await res.json()) as { reports?: ReportMeta[] };
        if (cancelled) return;
        setReports(Array.isArray(data.reports) ? data.reports : []);
      } catch {
        if (!cancelled) setError("失敗。話せ。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hydrated, mySessionId]);

  if (!hydrated || (!loading && reports.length === 0 && !error)) return null;

  return (
    <section className="mypage-section reports-section">
      <header className="reports-header">
        <h4 className="mypage-section-title font-display">REPORT</h4>
        <Link href="/reports" className="reports-more font-display">
          MORE <ArrowRight size={14} weight="bold" />
        </Link>
      </header>

      {error && <p className="reports-empty">{error}</p>}

      {reports.length > 0 && (
        <div className="reports-list">
          {reports.map((meta) => (
            <ReportCard key={meta.periodKey} meta={meta} />
          ))}
        </div>
      )}
    </section>
  );
}
