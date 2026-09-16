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
  if (!open) return null;
  return (
    <div className="modal-backdrop halieus-confirm-backdrop game-menu-top-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="halieus-confirm-dialog panel-enter" role="dialog" aria-modal="true" aria-labelledby="halieus-confirm-title">
        <div className="modal-handle" />
        <p className="modal-eyebrow">HALIEUS GAME ROOM</p>
        <h2 id="halieus-confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="halieus-confirm-actions">
          <button type="button" className="button-outline" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={destructive ? "button-danger" : "button-primary"} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
