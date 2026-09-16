import { useState } from "react";

interface RecoveryKeyPanelProps {
  recoveryKey: string | null | undefined;
  label?: string;
}

export function RecoveryKeyPanel({ recoveryKey, label = "Recovery key" }: RecoveryKeyPanelProps) {
  const [copied, setCopied] = useState(false);
  if (!recoveryKey) return null;
  const key = recoveryKey;

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="recovery-key-panel room-recovery-key-panel">
      <div>
        <span>{label}</span>
        <strong>{key}</strong>
        <small>Save this if you need to recover the same seat on another browser.</small>
      </div>
      <button type="button" onClick={() => void copyKey()}>{copied ? "Copied" : "Copy"}</button>
    </div>
  );
}
