"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";

type Props = {
  title: string;
  backHref: string;
  backLabel?: string;
};

export default function PageHeader({ title, backHref, backLabel = "BACK" }: Props) {
  return (
    <header className="page-header">
      <Link href={backHref} className="page-header-back font-display">
        <ArrowLeft size={14} weight="bold" />
        {backLabel}
      </Link>
      <h1 className="page-header-title font-display">{title}</h1>
    </header>
  );
}
