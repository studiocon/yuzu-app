"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import AvatarMark from "./AvatarMark";
import type { Post } from "@/lib/types";
import { getNickname } from "@/lib/userClient";

type Props = {
  myEmoji: string;
  myPosts: Post[];
};

const formatTimeLabel = (ts: number): string => {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}日前`;
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
};

const EMPTY_PHRASES = ["話せ。", "出せ。", "整えるな。"] as const;

export default function HomeView({ myEmoji, myPosts }: Props) {
  const emptyPhrase = useRef(EMPTY_PHRASES[Math.floor(Math.random() * EMPTY_PHRASES.length)]).current;
  const [nickname, setNickname] = useState("GUEST");

  useEffect(() => {
    setNickname(getNickname(myEmoji));
  }, [myEmoji]);

  return (
    <section className="mypage-view">
      <section className="mypage-section">
        <h4 className="mypage-section-title font-display">RECORDS</h4>
        <div className="mypage-post-list">
          {myPosts.length === 0 && (
            <p className="mypage-empty">{emptyPhrase}</p>
          )}
          {myPosts.map((p) => (
            <article key={p.id} className="post-card mypage-post-card">
              <div className="post-header">
                <AvatarMark emoji={p.emoji ?? myEmoji} size="sm" />
                <span className="post-name">{nickname}</span>
                <span className="post-meta">
                  <span className="post-index font-display">#{p.index}</span>
                  <span className="post-meta-sep" aria-hidden>·</span>
                  <time className="post-time">{formatTimeLabel(p.createdAt)}</time>
                </span>
                <CopyButton text={p.text} />
              </div>
              <div className="post-body">
                <p className="post-text">{p.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {}
    if (!ok) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {}
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <button
      type="button"
      className={"post-copy-btn" + (copied ? " is-copied" : "")}
      onClick={onClick}
      aria-label={copied ? "コピーしました" : "テキストをコピー"}
      title={copied ? "コピーしました" : "テキストをコピー"}
    >
      {copied ? <Check size={16} weight="bold" /> : <Copy size={16} weight="regular" />}
    </button>
  );
}
