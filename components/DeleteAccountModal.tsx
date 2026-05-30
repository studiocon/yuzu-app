"use client";

import { useEffect, useState } from "react";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

type AnimState = "opening" | "open" | "closing";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

const OPEN_MS = 220;
const CLOSE_MS = 220;

export default function DeleteAccountModal({ open, onClose, onConfirm }: Props) {
  const [mounted, setMounted] = useState(false);
  const [animState, setAnimState] = useState<AnimState>("opening");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setDeleting(false);
      setError(null);
      setAnimState("opening");
      const t = setTimeout(() => setAnimState("open"), OPEN_MS);
      return () => clearTimeout(t);
    } else if (mounted) {
      setAnimState("closing");
      const t = setTimeout(() => setMounted(false), CLOSE_MS);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted) return null;

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
      // 成功時は呼び出し側で遷移する（ここでは何もしない）
    } catch {
      setDeleting(false);
      setError("削除できなかった。もう一度。");
    }
  };

  return (
    <div
      className="confirm-modal"
      data-anim={animState}
      role="dialog"
      aria-modal="true"
      aria-label="アカウント削除の確認"
    >
      <div
        className="confirm-modal-scrim"
        onClick={deleting ? undefined : onClose}
      />
      <div className="confirm-modal-panel">
        <h2 className="confirm-modal-title font-display">全部消す。</h2>
        <p className="confirm-modal-body">記録も、番号も、戻らない。</p>

        {error && <p className="confirm-modal-error">{error}</p>}

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="confirm-modal-cancel"
            onClick={onClose}
            disabled={deleting}
          >
            やめる
          </button>
          <button
            type="button"
            className="confirm-modal-confirm font-display"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? "削除中…" : "消す"}
          </button>
        </div>
      </div>
    </div>
  );
}
