import type { GameActivityEntry } from "../../../../../shared/games/mega-board/game-state";

export interface MegaMoveRow {
  id: string;
  number: number;
  turn: number;
  at: number;
  kind: GameActivityEntry["kind"];
  actor: string;
  description: string;
  notation: string;
}

type Player = { id: string; name: string };

/**
 * Human-readable HGR notation inspired by chess move lists, not PGN.
 * Every entry is derived from one existing, server-recorded activity entry.
 * No dice, actions, positions or dates are reconstructed or invented.
 */
export function formatMegaMoveRows(
  activity: readonly GameActivityEntry[],
  players: readonly Player[],
): MegaMoveRow[] {
  const names = new Map(players.map(player => [player.id, player.name]));
  return activity.map((entry, index) => {
    const actor = entry.playerId ? (names.get(entry.playerId) ?? "Player") : "System";
    const description = entry.message.replace(/[\r\n\t]+/g, " ").trim();
    const notation = [
      String(index + 1).padStart(3, "0") + ".",
      "T" + entry.turnNumber,
      actor,
      entry.kind.toUpperCase(),
      description || "(No details recorded)",
    ].join(" | ");
    return { id: entry.id, number: index + 1, turn: entry.turnNumber,
      at: entry.at, kind: entry.kind, actor, description, notation };
  });
}

export function buildMegaMoveTranscript(
  roomCode: string,
  activity: readonly GameActivityEntry[],
  players: readonly Player[],
): string {
  const rows = formatMegaMoveRows(activity, players);
  const header = [
    "HGR MEGA BOARD — MOVE-BY-MOVE RECORD",
    "Room: " + roomCode,
    "Format: HGR notation v1 (not chess PGN)",
    "Recorded actions: " + rows.length,
    "Replay coverage may be shorter than the move list.",
    "Only server-recorded actions are included; historical gaps cannot be reconstructed.",
    "",
  ];
  return [...header, ...(rows.length ? rows.map(row =>
    row.notation + " | " + (Number.isFinite(row.at) && !Number.isNaN(new Date(row.at).getTime()) ? new Date(row.at).toISOString() : "time unavailable")
  ) : ["No recorded moves yet."])].join("\n");
}
