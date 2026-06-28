"use client";

import { useEffect, useState } from "react";

type AnimState = "opening" | "open" | "closing" | "hidden";

const SHOWN_KEY = "yuzu_splash_shown";

export default function SplashScreen() {
  const [state, setState] = useState<AnimState>("opening");

  useEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem(SHOWN_KEY) === "1";
    } catch {}

    if (alreadyShown) {
      setState("hidden");
      return;
    }

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const holdMs = reduced ? 400 : 850;
    const fadeMs = reduced ? 100 : 350;

    const raf = requestAnimationFrame(() => setState("open"));
    const t1 = setTimeout(() => setState("closing"), holdMs);
    const t2 = setTimeout(() => {
      setState("hidden");
      try {
        sessionStorage.setItem(SHOWN_KEY, "1");
      } catch {}
    }, holdMs + fadeMs);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="splash" data-state={state} role="status" aria-label="YUZU">
      <div className="splash-inner">
        {/*
          スプラッシュのロゴは静的 SVG。即時描画が要件で、next/image のローダ/最適化は
          SVG に効かず初回ペイントを遅らせるだけなので素の <img> を使う。
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="splash-logo"
          src="/logo.svg"
          alt="YUZU"
          width={240}
          height={79}
        />
        <div className="splash-tagline">BE TRUE</div>
      </div>
    </div>
  );
}
