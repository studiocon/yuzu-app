"use client";

import Link from "next/link";
import type { ReportMeta } from "@/lib/reportTypes";

type Props = { meta: ReportMeta; indexNum?: number };

export default function ReportCard({ meta, indexNum }: Props) {
  const kindLabel = meta.kind === "week"
    ? indexNum != null ? `WEEK #${indexNum}` : "WEEK"
    : indexNum != null ? `MONTH #${indexNum}` : "MONTH";

  return (
    <Link href={`/reports/${meta.periodKey}`} className="report-card">
      <div className="report-card-kind font-display">{kindLabel}</div>
      <div className="report-card-label">{meta.label}</div>
      {meta.headline && (
        <p className="report-card-headline">{meta.headline}</p>
      )}
      {meta.topics && meta.topics.length > 0 && (
        <div className="report-card-topics">
          {meta.topics.slice(0, 3).map((t, i) => (
            <span key={i} className="report-chip">{t}</span>
          ))}
        </div>
      )}
      {!meta.generated && (
        <div className="report-card-pending font-display">
          {meta.postCount}{" "}RECORDS · TAP TO READ
        </div>
      )}
    </Link>
  );
}
