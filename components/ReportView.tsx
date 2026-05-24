"use client";

import { useMemo } from "react";
import ReportsSection from "./ReportsSection";
import type { Post } from "@/lib/types";

type Props = {
  myPosts: Post[];
};

export default function ReportView({ myPosts }: Props) {
  const firstPostAt = useMemo(
    () => (myPosts.length > 0 ? myPosts[myPosts.length - 1].createdAt : null),
    [myPosts],
  );

  return (
    <section className="report-view">
      <h2 className="report-view-title font-display">REPORT</h2>
      <ReportsSection firstPostAt={firstPostAt} />
    </section>
  );
}
