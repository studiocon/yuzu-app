"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import type { Post } from "@/lib/types";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

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

  useBodyScrollLock(mounted);

  // onClose は親の inline arrow なので毎 render 参照が変わる。
  // effect deps に含めると Strict Mode / 親再 render で cleanup が走り、
  // popstate effect の history.back() が誤発火 → モーダル即閉じの原因になる。
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted]);

  // 戻るボタンで閉じる UX を提供する。
  // - pushedRef で pushState の冪等性を担保（Strict Mode 二重 mount 対策）
  // - userBackedRef で「ユーザの戻る操作」と「自前 history.back()」を区別し
  //   閉じる時に二重 back を防ぐ
  const pushedRef = useRef(false);
  const userBackedRef = useRef(false);
  useEffect(() => {
    if (!mounted) {
      if (pushedRef.current && !userBackedRef.current && window.history.state?.indexDetail) {
        window.history.back();
      }
      pushedRef.current = false;
      userBackedRef.current = false;
      return;
    }
    if (!pushedRef.current) {
      window.history.pushState({ indexDetail: true }, "");
      pushedRef.current = true;
    }
    const onPop = () => {
      userBackedRef.current = true;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [mounted]);

  if (!mounted || !post) return null;

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
