import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import type {
  GameRoom,
} from "../types/game.js";
import {
  CHANCE_CARDS,
  COMMUNITY_CHEST_CARDS,
  getGameCard,
} from "../../../../../shared/games/mega-board/cards.js";
import { syncBlockingTurnPhase } from "./turn-engine.js";
import { rooms } from "../state/rooms.js";
import { ensurePlayerStats, captureStats } from "./stats.js";

const SAVE_VERSION = 1;
const configuredSavePath =
  process.env.ROOM_SAVE_PATH?.trim();
const SAVE_PATH = configuredSavePath
  ? path.resolve(configuredSavePath)
  : path.resolve(
      process.env.MEGA_MONOPOLY_DATA_DIR ??
        path.join(
          process.cwd(),
          "data",
        ),
      "rooms.json",
    );
const DATA_DIRECTORY =
  path.dirname(SAVE_PATH);
const TEMP_PATH = `${SAVE_PATH}.tmp`;

interface SaveDocument {
  version: number;
  savedAt: number;
  rooms: GameRoom[];
}

let saveChain: Promise<void> =
  Promise.resolve();

function normaliseCardDeck(
  current: string[] | undefined,
  canonicalIds: string[],
  heldCardIds: Set<string>,
): string[] {
  const allowed = new Set(canonicalIds);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const id of current ?? []) {
    if (!allowed.has(id) || heldCardIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  for (const id of canonicalIds) {
    if (heldCardIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  return result;
}

function prepareLoadedRoom(
  room: GameRoom,
): GameRoom {
  room.createdAt ??= Date.now();
  room.updatedAt ??= room.createdAt;
  room.hostDisconnectDeadline ??=
    null;
  room.freeParkingJackpotEnabled ??=
    false;
  room.blitz ??= false;

  room.players = room.players.map(
    (player) => {
      const isAi =
        player.isAi ??
        player.id.startsWith("ai:");

      return {
        ...player,
        isAi,
        aiDifficulty: isAi
          ? player.aiDifficulty ??
            "normal"
          : null,
        isConnected: isAi,
        hasLeft:
          player.hasLeft ?? false,
        disconnectedAt: isAi
          ? null
          : player.disconnectedAt ??
            Date.now(),
      };
    },
  );

  if (room.gameState) {
    room.gameState.activityLog ??= [];
    room.gameState.freeParkingJackpotEnabled ??=
      room.freeParkingJackpotEnabled;
    room.gameState.rollSequence ??= 0;
    room.gameState.lastAcceptedRollAtByPlayerId ??= {};
    room.gameState.speedDieRetired ??= false;
    room.gameState.ranked ??= room.ranked ?? false;
    room.gameState.blitz ??= room.blitz ?? false;
    room.gameState.rankedMatchId ??= null;
    room.gameState.rankedProcessed ??= false;
    room.gameState.rankedResults ??= [];
    room.gameState.lastTradeResult ??= null;
    room.gameState.tradeRejectAllTurnByPlayerId ??= {};
    room.gameState.lastCardDraw ??= null;
    room.gameState.lastGlobalNotice ??= null;
    room.gameState.globalNotices ??= [];
    room.gameState.gameStartedAt ??= room.updatedAt ?? room.createdAt ?? Date.now();
    room.gameState.playerStats ??= {};

    const heldCardIds = new Set(
      room.gameState.players.flatMap((player) => player.getOutOfJailCardIds ?? []),
    );
    room.gameState.chanceDeck = normaliseCardDeck(
      room.gameState.chanceDeck,
      CHANCE_CARDS.map((card) => card.id),
      heldCardIds,
    );
    room.gameState.communityChestDeck = normaliseCardDeck(
      room.gameState.communityChestDeck,
      COMMUNITY_CHEST_CARDS.map((card) => card.id),
      heldCardIds,
    );

    if (room.gameState.pendingCard && !getGameCard(room.gameState.pendingCard.cardId)) {
      const resumeAction = room.gameState.pendingCard.resumeAction;
      room.gameState.pendingCard = null;
      room.gameState.turnPhase = resumeAction === "reroll" ? "roll" : "optional-actions";
    }
    if (room.gameState.lastCardDraw && !getGameCard(room.gameState.lastCardDraw.cardId)) {
      room.gameState.lastCardDraw = null;
    }

    const pendingSpeed = room.gameState.pendingSpeedDieAction;
    if (pendingSpeed?.type === "bus") {
      pendingSpeed.white1 ??= room.gameState.lastDiceRoll?.white1 ?? Math.floor(pendingSpeed.whiteDiceTotal / 2);
      pendingSpeed.white2 ??= room.gameState.lastDiceRoll?.white2 ?? (pendingSpeed.whiteDiceTotal - pendingSpeed.white1);
    }

    for (
      const player
      of room.gameState.players
    ) {
      player.isAi ??=
        player.id.startsWith("ai:");
      player.aiDifficulty =
        player.isAi
          ? player.aiDifficulty ??
            "normal"
          : null;
      // Human Autopilot is an interactive convenience, not a persistent seat state.
      // Reset it on recovery so a restarted server can never continue playing
      // a human seat before that player has a chance to reconnect and take control.
      player.autopilotEnabled = false;
      player.autopilotDifficulty ??=
        "normal";
      player.isConnected =
        player.isAi;
      player.busTicketIds ??= [];
      player.getOutOfJailCardIds ??= [];
      ensurePlayerStats(room.gameState, player);
    }

    captureStats(room.gameState);
    syncBlockingTurnPhase(room.gameState);
  }

  return room;
}

export async function loadRoomsFromDisk(): Promise<number> {
  try {
    const raw = await readFile(
      SAVE_PATH,
      "utf8",
    );
    const document = JSON.parse(
      raw,
    ) as SaveDocument;

    if (
      document.version !==
      SAVE_VERSION ||
      !Array.isArray(document.rooms)
    ) {
      throw new Error(
        "Unsupported room save format.",
      );
    }

    rooms.clear();

    for (const savedRoom of document.rooms) {
      if (
        !savedRoom?.code ||
        !Array.isArray(savedRoom.players)
      ) {
        continue;
      }

      const room = prepareLoadedRoom(
        savedRoom,
      );
      rooms.set(room.code, room);
    }

    return rooms.size;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return 0;
    }

    console.error(
      "Unable to load saved rooms:",
      error,
    );
    return 0;
  }
}

async function writeSnapshot(): Promise<void> {
  await mkdir(DATA_DIRECTORY, {
    recursive: true,
  });

  const document: SaveDocument = {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    rooms: [...rooms.values()],
  };

  await writeFile(
    TEMP_PATH,
    JSON.stringify(
      document,
      null,
      2,
    ),
    "utf8",
  );

  await rename(
    TEMP_PATH,
    SAVE_PATH,
  );
}

export function queueRoomSave(): void {
  saveChain = saveChain
    .catch(() => undefined)
    .then(writeSnapshot)
    .catch((error) => {
      console.error(
        "Unable to save rooms:",
        error,
      );
    });
}

export async function flushRoomSave(): Promise<void> {
  queueRoomSave();
  await saveChain;
}

export function getSavePath(): string {
  return SAVE_PATH;
}
