"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";

type Props = {
  title?: string;
  backHref: string;
  backLabel?: string;
};

export default function PageHeader({ title, backHref, backLabel = "BACK" }: Props) {
  return (
    <header className="page-header">
      <Link href={backHref} className="page-header-back iconbtn iconbtn--ghost" aria-label={backLabel}>
        <ArrowLeft size={18} weight="bold" />
      </Link>
      {title && <h1 className="page-header-title font-display">{title}</h1>}
    </header>
  );
}
