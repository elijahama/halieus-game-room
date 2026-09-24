import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { RoomChatGame, RoomChatJoinResponse, RoomChatMessage, RoomChatRole, RoomChatSendResponse } from "../../../../shared/platform/room-chat";
import { socket } from "../network/sockets";
import { HgrIcon } from "./HgrIcon";

export interface RoomActivityEntry {
  id: string;
  label: string;
  at?: number | null;
}

interface RoomChatPanelProps {
  game: RoomChatGame;
  code: string;
  accent: string;
  gameLog?: RoomActivityEntry[];
  spectatorCount?: number;
  spectatorNames?: string[];
  embedded?: boolean;
  defaultOpen?: boolean;
}

type ActivityTab = "chat" | "log" | "spectators";

function formatMessageTime(value: number): string {
  return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Shared live-room activity panel.
 *
 * Chat, public game activity and spectator presence live in one compact surface so
 * games do not need separate floating widgets for the same room-level information.
 * Game log entries must contain public information only; hidden cards/private state
 * remain owned by each game's normal viewer-safe state contract.
 */
export function RoomChatPanel({ game, code, accent, gameLog = [], spectatorCount = 0, spectatorNames = [], embedded = false, defaultOpen = embedded }: RoomChatPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<ActivityTab>("chat");
  const [messages, setMessages] = useState<RoomChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [viewerRole, setViewerRole] = useState<RoomChatRole | null>(null);
  const [viewerName, setViewerName] = useState("");
  const [status, setStatus] = useState("Connecting chat…");
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef(open);
  const tabRef = useRef(activeTab);
  openRef.current = open;
  tabRef.current = activeTab;

  const roomLabel = useMemo(() => code.trim().toUpperCase(), [code]);
  const latestMessage = messages[messages.length - 1] ?? null;
  const visibleLog = useMemo(() => gameLog.slice(-100).reverse(), [gameLog]);
  const visibleSpectatorNames = useMemo(() => Array.from(new Set(spectatorNames.map((name) => name.trim()).filter(Boolean))), [spectatorNames]);

  useEffect(() => {
    let active = true;
    const join = () => {
      socket.emit("room-chat:join", { game, code: roomLabel }, (response: RoomChatJoinResponse) => {
        if (!active) return;
        if (!response?.ok) {
          setStatus(response?.reason ?? "Room chat unavailable.");
          setViewerRole(null);
          return;
        }
        setMessages(response.messages ?? []);
        setViewerRole(response.viewerRole ?? null);
        setViewerName(response.viewerName ?? "");
        setStatus("");
      });
    };
    const onMessage = (message: RoomChatMessage) => {
      if (message.game !== game || message.code !== roomLabel) return;
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message].slice(-120));
      if (!openRef.current || tabRef.current !== "chat") setUnread((value) => Math.min(99, value + 1));
    };
    const onConnect = () => join();

    socket.on("room-chat:message", onMessage);
    socket.on("connect", onConnect);
    join();

    return () => {
      active = false;
      socket.off("room-chat:message", onMessage);
      socket.off("connect", onConnect);
    };
  }, [game, roomLabel]);

  useEffect(() => {
    if (!open || activeTab !== "chat") return;
    setUnread(0);
    const frame = window.requestAnimationFrame(() => {
      const node = listRef.current;
      if (node) node.scrollTop = node.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, open, activeTab]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.replace(/\s+/g, " ").trim();
    if (!text || !viewerRole) return;
    setDraft("");
    socket.emit("room-chat:send", { game, code: roomLabel, text }, (response: RoomChatSendResponse) => {
      if (!response?.ok) {
        setStatus(response?.reason ?? "Message could not be sent.");
        setDraft(text);
      } else {
        setStatus("");
      }
    });
  }

  return (
    <aside className={`room-chat-shell game-${game} ${embedded ? "is-embedded" : "is-floating"} ${open ? "is-open" : ""}`} style={{ ["--chat-accent" as string]: accent }} aria-label="Room activity">
      {open && (
        <section className="room-chat-panel glass-card" role="dialog" aria-label={`Room ${roomLabel} activity`}>
          <header>
            <div>
              <p>Live room</p>
              <strong>{roomLabel}</strong>
            </div>
            <div className="room-chat-identity">
              {viewerRole && <span className={`room-chat-role is-${viewerRole}`}>{viewerRole}</span>}
              <small>{viewerName || "Room member"}</small>
            </div>
            <button type="button" className="room-chat-close" onClick={() => setOpen(false)} aria-label="Close room activity">×</button>
          </header>

          <nav className="room-activity-tabs" aria-label="Room activity sections">
            <button type="button" className={activeTab === "chat" ? "is-active" : ""} onClick={() => setActiveTab("chat")}>Chat{unread > 0 && <b>{unread}</b>}</button>
            <button type="button" className={activeTab === "log" ? "is-active" : ""} onClick={() => setActiveTab("log")}>Game Log</button>
            <button type="button" className={activeTab === "spectators" ? "is-active" : ""} onClick={() => setActiveTab("spectators")}>Spectators <b>{spectatorCount}</b></button>
          </nav>

          {activeTab === "chat" && (
            <>
              <div ref={listRef} className="room-chat-messages" aria-live="polite">
                {messages.length === 0 && <div className="room-chat-empty"><strong>No messages yet</strong><span>Players and spectators share this room chat.</span></div>}
                {messages.map((message) => (
                  <article key={message.id} className={`room-chat-message ${message.senderName === viewerName && message.senderRole === viewerRole ? "is-own" : ""}`}>
                    <header>
                      <strong>{message.senderName}</strong>
                      <span className={`room-chat-role is-${message.senderRole}`}>{message.senderRole}</span>
                      <time dateTime={new Date(message.at).toISOString()}>{formatMessageTime(message.at)}</time>
                    </header>
                    <p>{message.text}</p>
                  </article>
                ))}
              </div>
              <form className="room-chat-compose" onSubmit={submit}>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value.slice(0, 500))}
                  placeholder={viewerRole ? "Message the room…" : "Chat unavailable"}
                  aria-label="Room chat message"
                  disabled={!viewerRole}
                />
                <button type="submit" disabled={!viewerRole || !draft.trim()} aria-label="Send room chat message">Send</button>
              </form>
              {status && <small className="room-chat-status">{status}</small>}
            </>
          )}

          {activeTab === "log" && (
            <div className="room-activity-log" aria-live="polite">
              {visibleLog.length === 0 ? (
                <div className="room-chat-empty"><strong>No public actions yet</strong><span>The game log fills as public table or board actions happen.</span></div>
              ) : visibleLog.map((entry) => (
                <article key={entry.id}>
                  {entry.at ? <time dateTime={new Date(entry.at).toISOString()}>{formatMessageTime(entry.at)}</time> : <span aria-hidden="true">•</span>}
                  <p>{entry.label}</p>
                </article>
              ))}
            </div>
          )}

          {activeTab === "spectators" && (
            <div className="room-spectator-panel">
              <div className="room-spectator-summary"><strong>{spectatorCount}</strong><span>{spectatorCount === 1 ? "spectator watching" : "spectators watching"}</span></div>
              {visibleSpectatorNames.length > 0 ? (
                <div className="room-spectator-list">
                  {visibleSpectatorNames.map((name) => <span key={name}>{name}</span>)}
                </div>
              ) : (
                <div className="room-chat-empty"><strong>{spectatorCount > 0 ? "Spectators are present" : "No spectators right now"}</strong><span>{spectatorCount > 0 ? "This game currently exposes spectator count without public spectator names." : "Anyone joining through spectator view will appear here."}</span></div>
              )}
            </div>
          )}
        </section>
      )}

      <button type="button" className="room-chat-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="room-chat-trigger-icon" aria-hidden="true"><HgrIcon name="chat" size={18} /></span>
        <strong>Room</strong>
        <span className="room-chat-preview">{latestMessage ? `${latestMessage.senderName}: ${latestMessage.text}` : "Chat · Game Log · Spectators"}</span>
        {unread > 0 && <b>{unread}</b>}
      </button>
    </aside>
  );
}
