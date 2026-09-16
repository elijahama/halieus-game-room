export interface SpectatorInfo {
  id: string;
  name: string;
}

const spectatorsByRoom = new Map<string, Map<string, string>>();

export function addSpectator(code: string, socketId: string, name: string): void {
  const roomSpectators = spectatorsByRoom.get(code) ?? new Map<string, string>();
  roomSpectators.set(socketId, name.trim() || "Spectator");
  spectatorsByRoom.set(code, roomSpectators);
}

export function removeSpectator(code: string, socketId: string): void {
  const roomSpectators = spectatorsByRoom.get(code);
  if (!roomSpectators) return;
  roomSpectators.delete(socketId);
  if (roomSpectators.size === 0) spectatorsByRoom.delete(code);
}

export function removeSpectatorEverywhere(socketId: string): string[] {
  const affected: string[] = [];
  for (const [code, roomSpectators] of spectatorsByRoom.entries()) {
    if (!roomSpectators.delete(socketId)) continue;
    affected.push(code);
    if (roomSpectators.size === 0) spectatorsByRoom.delete(code);
  }
  return affected;
}

export function listSpectators(code: string): SpectatorInfo[] {
  return [...(spectatorsByRoom.get(code) ?? new Map<string, string>()).entries()].map(
    ([id, name]) => ({ id, name }),
  );
}
