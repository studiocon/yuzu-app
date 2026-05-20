"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import ReportCard from "./ReportCard";
import type { ReportMeta } from "@/lib/reportTypes";
import { buildMockReportMetas, isMockMode } from "@/lib/mockReports";
import { jstSundayStart } from "@/lib/period";

const DAY_MS = 24 * 60 * 60 * 1000;
const JST_MS = 9 * 60 * 60 * 1000;

function weekIndexNum(periodStart: number, firstPostAt: number): number {
  const firstWeekStart = jstSundayStart(firstPostAt);
  return Math.round((periodStart - firstWeekStart) / (7 * DAY_MS)) + 1;
}

function monthIndexNum(periodStart: number, firstPostAt: number): number {
  const d1 = new Date(firstPostAt + JST_MS);
  const d2 = new Date(periodStart + JST_MS);
  return (d2.getUTCFullYear() - d1.getUTCFullYear()) * 12 + (d2.getUTCMonth() - d1.getUTCMonth()) + 1;
}

type Props = {
  mySessionId: string | null;
  firstPostAt?: number | null;
};

export default function ReportsSection({ mySessionId, firstPostAt }: Props) {
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
          {reports.map((meta) => {
            const n = firstPostAt != null
              ? meta.kind === "week"
                ? weekIndexNum(meta.rangeStart, firstPostAt)
                : monthIndexNum(meta.rangeStart, firstPostAt)
              : undefined;
            return <ReportCard key={meta.periodKey} meta={meta} indexNum={n} />;
          })}
        </div>
      )}
    </section>
  );
}
