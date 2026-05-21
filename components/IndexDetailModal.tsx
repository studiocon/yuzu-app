"use client";

import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";
import type { Post } from "@/lib/types";

type AnimState = "opening" | "open" | "closing";

const OPEN_MS = 280;
const CLOSE_MS = 220;

type Props = {
  post: Post | null;
  onClose: () => void;
};

const formatStamp = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function IndexDetailModal({ post, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [animState, setAnimState] = useState<AnimState>("opening");

  useEffect(() => {
    if (post) {
      setMounted(true);
      setAnimState("opening");
      const t = setTimeout(() => setAnimState("open"), 20);
      return () => clearTimeout(t);
    } else if (mounted) {
      setAnimState("closing");
      const t = setTimeout(() => setMounted(false), CLOSE_MS);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, onClose]);

  useEffect(() => {
    if (!mounted) return;
    window.history.pushState({ indexDetail: true }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.indexDetail) {
        window.history.back();
      }
    };
  }, [mounted, onClose]);

  if (!mounted || !post) return null;

  void OPEN_MS;

  return (
    <div
      className="index-detail-modal"
      data-anim={animState}
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button
        type="button"
        className="index-detail-close"
        aria-label="閉じる"
        onClick={onClose}
      >
        <X size={22} weight="bold" />
      </button>

      <div className="index-detail-body">
        <p className="index-detail-num font-display">#{post.index}</p>
        <p className="index-detail-text">{post.text}</p>
        <p className="index-detail-stamp font-display">{formatStamp(post.createdAt)}</p>
      </div>
    </div>
  );
}
