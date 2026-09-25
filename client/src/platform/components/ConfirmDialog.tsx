import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useModalLifecycle } from "./useModalLifecycle";
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", destructive = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  useModalLifecycle(open, dialogRef, onCancel);
  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop halieus-confirm-backdrop game-menu-top-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="halieus-confirm-dialog panel-enter" role="dialog" aria-modal="true" ref={dialogRef} aria-labelledby={titleId}>
        <div className="modal-handle" />
        <p className="modal-eyebrow">HALIEUS GAME ROOM</p>
        <h2 id={titleId}>{title}</h2>
        <p>{message}</p>
        <div className="halieus-confirm-actions">
          <button type="button" className="button-outline" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={destructive ? "button-danger" : "button-primary"} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>, document.fullscreenElement ?? document.body
  );
}
