"use client";

import { useState } from "react";
import { useModalAnimation } from "@/lib/useModalAnimation";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export default function DeleteAccountModal({ open, onClose, onConfirm }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const { mounted, animState } = useModalAnimation(open, {
    onOpen: () => {
      setDeleting(false);
      setError(null);
      setConfirmText("");
    },
  });

  if (!mounted) return null;

  const canDelete = confirmText.trim().toUpperCase() === "YUZU";

  const handleConfirm = async () => {
    if (!canDelete) return;
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
        <h2 className="confirm-modal-title font-display">全部消す</h2>
        <p className="confirm-modal-body">記録も、番号も、戻らない。</p>

        <p className="confirm-modal-prompt font-display">YUZU と打て</p>
        <input
          type="text"
          className="confirm-modal-input"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && canDelete) handleConfirm(); }}
          disabled={deleting}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-label="確認のため YUZU と入力"
        />

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
            disabled={deleting || !canDelete}
          >
            {deleting ? "削除中…" : "消す"}
          </button>
        </div>
      </div>
    </div>
  );
}
