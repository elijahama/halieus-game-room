import { type FormEvent, useState } from "react";

const FEEDBACK_CATEGORIES = [
  "Bug",
  "UI / layout",
  "Gameplay / rules",
  "Connection / rejoin",
  "Suggestion",
  "Other",
] as const;

interface FeedbackFormProps {
  gameName: string;
  roomCode: string;
  playerName: string;
  onBack: () => void;
}

export function FeedbackForm({ gameName, roomCode, playerName, onBack }: FeedbackFormProps) {
  const [category, setCategory] = useState<(typeof FEEDBACK_CATEGORIES)[number]>(FEEDBACK_CATEGORIES[0]);
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = details.trim();
    if (trimmed.length < 4) {
      setStatus("Add a little more detail first.");
      return;
    }

    setSending(true);
    setStatus("Sending feedback…");
    try {
      const response = await fetch("/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: `${gameName} / ${category}`,
          details: trimmed,
          roomCode,
          playerName: playerName.trim() || "Unknown player",
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });
      if (!response.ok) throw new Error("Feedback request failed.");
      setDetails("");
      setStatus("Feedback saved. Thank you.");
    } catch {
      setStatus("Could not save feedback. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="feedback-form" onSubmit={submitFeedback}>
      <header className="modal-heading-row">
        <div>
          <p className="modal-eyebrow">{gameName} feedback</p>
          <h2>Tell me what happened</h2>
        </div>
        <button type="button" className="icon-button" aria-label="Back to game menu" onClick={onBack}>←</button>
      </header>

      <p className="feedback-help">Room and browser details are attached automatically.</p>

      <label>
        <span>Category</span>
        <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
          {FEEDBACK_CATEGORIES.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>

      <label>
        <span>What went wrong or what should change?</span>
        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          rows={6}
          maxLength={4000}
          placeholder={`Example: The ${gameName} controls overlapped the table on my screen.`}
        />
      </label>

      <div className="feedback-meta">
        <span>Player: <strong>{playerName || "Unknown"}</strong></span>
        <span>Room: <strong>{roomCode}</strong></span>
      </div>

      {status && <p className="feedback-status" role="status">{status}</p>}

      <div className="confirmation-buttons">
        <button type="button" className="button-muted" onClick={onBack}>Back</button>
        <button type="submit" className="button-primary" disabled={sending}>{sending ? "Sending…" : "Send feedback"}</button>
      </div>
    </form>
  );
}
