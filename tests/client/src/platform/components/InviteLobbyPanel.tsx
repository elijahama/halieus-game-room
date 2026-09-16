import { useEffect, useMemo, useState } from "react";

import * as QRCode from "qrcode";

interface InviteLobbyPanelProps {
  roomCode: string;
  darkMode: boolean;
  gameTitle: string;
  invitePathPrefix: string;
  accent: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  spectatorPathPrefix?: string;
  theme: {
    secondaryBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
}

interface InviteOriginOption {
  label: string;
  origin: string;
}

interface InviteOriginsResponse {
  currentOrigin: string;
  preferredOrigin: string;
  publicOrigin?: string | null;
  origins: InviteOriginOption[];
}

const INVITE_ORIGIN_STORAGE_KEY = "halieus-invite-origin";

function isLoopbackOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function joinPath(prefix: string, roomCode: string): string {
  const cleanPrefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  return `${cleanPrefix}/${roomCode}`;
}

export function InviteLobbyPanel({
  roomCode,
  darkMode,
  gameTitle,
  invitePathPrefix,
  accent,
  eyebrow = "Private room invite",
  title = "Invite players",
  description = "Share one link or QR code and bring friends straight into this waiting room.",
  spectatorPathPrefix,
  theme,
}: InviteLobbyPanelProps) {
  const [qrCode, setQrCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [shareOrigin, setShareOrigin] = useState(window.location.origin);
  const [originOptions, setOriginOptions] = useState<InviteOriginOption[]>([
    { label: "This browser", origin: window.location.origin },
  ]);

  useEffect(() => {
    let cancelled = false;
    const savedOrigin = window.localStorage.getItem(INVITE_ORIGIN_STORAGE_KEY);

    void fetch("/invite-origins")
      .then(async (response) => {
        if (!response.ok) throw new Error("Invite origins unavailable.");
        return await response.json() as InviteOriginsResponse;
      })
      .then((payload) => {
        if (cancelled) return;
        const options = payload.origins.length > 0
          ? payload.origins
          : [{ label: "This browser", origin: window.location.origin }];
        setOriginOptions(options);

        const savedIsAvailable = Boolean(savedOrigin) && options.some((option) => option.origin === savedOrigin);
        const nextOrigin = savedIsAvailable && savedOrigin
          ? savedOrigin
          : isLoopbackOrigin(window.location.origin)
            ? payload.preferredOrigin
            : window.location.origin;
        setShareOrigin(nextOrigin);
      })
      .catch(() => {
        if (!cancelled && savedOrigin) setShareOrigin(savedOrigin);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(INVITE_ORIGIN_STORAGE_KEY, shareOrigin);
  }, [shareOrigin]);

  const inviteUrl = useMemo(
    () => `${shareOrigin}${joinPath(invitePathPrefix, roomCode)}`,
    [invitePathPrefix, roomCode, shareOrigin],
  );
  const spectatorUrl = useMemo(
    () => spectatorPathPrefix ? `${shareOrigin}${joinPath(spectatorPathPrefix, roomCode)}` : "",
    [roomCode, shareOrigin, spectatorPathPrefix],
  );
  const isLocalOnly = isLoopbackOrigin(shareOrigin);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(inviteUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 256,
      color: { dark: "#111827", light: "#ffffff" },
    })
      .then((dataUrl) => { if (!cancelled) setQrCode(dataUrl); })
      .catch(() => { if (!cancelled) setQrCode(""); });
    return () => { cancelled = true; };
  }, [darkMode, inviteUrl]);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setShareMessage("Invite copied");
      window.setTimeout(() => {
        setCopied(false);
        setShareMessage("");
      }, 1800);
    } catch {
      setShareMessage("Copy the link manually.");
    }
  };

  const shareInvite = async () => {
    if (!navigator.share) {
      await copyInvite();
      return;
    }
    try {
      await navigator.share({
        title: `${gameTitle} room ${roomCode}`,
        text: `Join my ${gameTitle} room in Halieus Game Room.`,
        url: inviteUrl,
      });
    } catch {
      // Closing the native share sheet is not an error.
    }
  };

  return (
    <section
      className="invite-lobby-panel invite-lobby-panel-redesigned panel-enter"
      style={{
        background: theme.secondaryBackground,
        borderColor: theme.border,
        ["--invite-accent" as string]: accent,
      }}
    >
      <div className="invite-lobby-copy">
        <div className="invite-panel-heading">
          <div className="invite-panel-icon" aria-hidden="true">↗</div>
          <div>
            <p className="modal-eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
            <p style={{ color: theme.mutedText }}>{description}</p>
          </div>
          <button type="button" className="invite-room-code-chip" onClick={() => void navigator.clipboard?.writeText(roomCode)} title="Copy room code">
            <span>Room</span>
            <strong>{roomCode}</strong>
          </button>
        </div>

        <div className="invite-url-box" style={{ borderColor: theme.border }}>
          <span>{inviteUrl}</span>
          <button type="button" onClick={() => void copyInvite()}>{copied ? "Copied" : "Copy link"}</button>
        </div>

        <div className="invite-action-row">
          <button type="button" className="button-primary" onClick={() => void shareInvite()}>↗ Share invite</button>
          <a className="button-secondary invite-open-link" href={inviteUrl} target="_blank" rel="noreferrer">Open guest view</a>
          {spectatorUrl && <button type="button" className="button-secondary" onClick={() => void navigator.clipboard?.writeText(spectatorUrl)}>Copy spectator link</button>}
          {spectatorUrl && <a className="button-secondary invite-open-link" href={spectatorUrl} target="_blank" rel="noreferrer">Open spectator view</a>}
        </div>

        <div className="invite-panel-footer">
          {originOptions.length > 1 && (
            <label className="invite-origin-picker invite-origin-picker-compact">
              <span>Share using</span>
              <select
                value={shareOrigin}
                onChange={(event) => setShareOrigin(event.target.value)}
                style={{ background: theme.secondaryBackground, color: theme.text, borderColor: theme.border }}
              >
                {originOptions.map((option) => <option key={option.origin} value={option.origin}>{option.label}</option>)}
              </select>
            </label>
          )}

          <div className={`invite-network-note ${isLocalOnly ? "" : "invite-network-ready"}`}>
            <strong>{isLocalOnly ? "Local-only address" : "Invite link ready"}</strong>
            <span>{isLocalOnly ? "Choose a network/public address before sharing with another device." : "Friends can use this link or QR code to open the correct game and room."}</span>
          </div>
        </div>

        {shareMessage && <small className="invite-share-message" role="status">{shareMessage}</small>}
      </div>

      <div className="invite-qr-card">
        {qrCode ? <img src={qrCode} alt={`QR code for ${gameTitle} room ${roomCode}`} /> : <div className="invite-qr-loading">QR</div>}
        <strong>Scan to join</strong>
        <span>{gameTitle} · {roomCode}</span>
      </div>
    </section>
  );
}
