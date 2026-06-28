import { useEffect, useRef, useState } from "react";
import { useBodyScrollLock } from "./useBodyScrollLock";

// `open` prop 駆動モーダルの opening → open → closing 状態機械を一元化する。
// LoginModal / ContactModal / DeleteAccountModal / ApiTokenModal が同一の boilerplate を
// 持っていたので抽出した（CLAUDE.md「共通フックは lib/use*.ts」）。
//
// - mounted: DOM にマウントすべきか（closing アニメ完了後に false）
// - animState: data-state 属性に流して CSS 側でアニメさせる
// - onOpen: open へ遷移した瞬間に固有 state をリセットするためのコールバック
//   （毎 render 参照が変わっても ref 経由で最新を呼ぶので stale closure にならない）
//
// 「measuring」を挟む RecordModal や、常時マウントの IndexDetailModal / SignalCardModal は
// 状態機械が異なるため対象外。

export type ModalAnimState = "opening" | "open" | "closing";

export function useModalAnimation(
  open: boolean,
  opts: { openMs?: number; closeMs?: number; onOpen?: () => void } = {},
): { mounted: boolean; animState: ModalAnimState } {
  const openMs = opts.openMs ?? 220;
  const closeMs = opts.closeMs ?? 220;

  const [mounted, setMounted] = useState(false);
  const [animState, setAnimState] = useState<ModalAnimState>("opening");

  useBodyScrollLock(open);

  const onOpenRef = useRef(opts.onOpen);
  onOpenRef.current = opts.onOpen;

  useEffect(() => {
    if (open) {
      setMounted(true);
      onOpenRef.current?.();
      setAnimState("opening");
      const t = setTimeout(() => setAnimState("open"), openMs);
      return () => clearTimeout(t);
    } else if (mounted) {
      setAnimState("closing");
      const t = setTimeout(() => setMounted(false), closeMs);
      return () => clearTimeout(t);
    }
  // mounted を依存に入れると closing 中の再評価で二重発火するため open のみで駆動する。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return { mounted, animState };
}
