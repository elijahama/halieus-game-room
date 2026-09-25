import type { Request } from "express";
import { roomCosmeticState } from "../../../platform/accounts.js";
import { SKIN_CATALOG } from "../../../../../shared/platform/skins.js";
import { publicProgressionState } from "../../../platform/progression.js";
import { pushGlobalNotice, recordActivity } from "../utils/activity.js";
import { randomBytes } from "node:crypto";
import type { Server, Socket } from "socket.io";

import { createInitialGameState } from "../../../../../shared/games/mega-board/game-state.js";
import { rooms } from "../state/rooms.js";
import { addSpectator, listSpectators, removeSpectator } from "../state/spectators.js";
import type {
  CreateGamePayload,
  GameResponse,
  JoinGamePayload,
  ReconnectGamePayload,
  RoomCodePayload,
  RoomPlayer,
  RoomPreviewResponse,
} from "../types/game.js";
import { emitGameState } from "../utils/game-state.js";
import { initialiseCardDecks } from "../utils/cards.js";
import { queueRoomSave } from "../utils/persistence.js";
import { reconnectRoomPlayer } from "../utils/reconnection.js";
import { cancelHostGrace } from "../utils/host-grace.js";
import { toPublicGameRoom } from "../utils/room-view.js";
import { syncAuctionTimer } from "../utils/auction-timer.js";
import { allocateBlitzProperties } from "../utils/blitz.js";
import { syncSpeedDieRetirement } from "../utils/speed-die-lifecycle.js";

const MINIMUM_PLAYERS = 2;
const MAXIMUM_PLAYERS = 8;

function createRecoveryKey(): string {
  return randomBytes(8)
    .toString("base64url")
    .slice(0, 10)
    .toUpperCase();
}

function emitLobby(
  io: Server,
  code: string,
): void {
  const room = rooms.get(code);
  if (!room) return;
  io.to(code).emit(
    "lobby:updated",
    toPublicGameRoom(room),
  );
}

interface SpectatePayload extends RoomCodePayload {
  playerName?: string;
}

export function registerLobbyHandlers(
  io: Server,
  socket: Socket,
): void {
  socket.on("game:set-board-style", async (payload: { code: string; style: string }, acknowledge: (response: GameResponse) => void) => {
    if (typeof acknowledge !== "function") return;
    if (typeof payload?.code !== "string" || typeof payload?.style !== "string") { acknowledge({ ok: false, reason: "A room and board style are required." }); return; }
    const room = rooms.get(payload.code.trim().toUpperCase());
    const allowed = () => room && rooms.get(room.code) === room && !room.started && room.hostId === socket.id;
    if (!allowed()) { acknowledge({ ok: false, reason: "Only the host can change Room Style before play." }); return; }
    try {
      const cosmetics = await roomCosmeticState(socket.request as Request);
      if (!SKIN_CATALOG.some(s => s.slot === "mega-board" && s.id === payload.style) || !cosmetics.entitlements.includes(payload.style)) {
        acknowledge({ ok: false, reason: "That board style has not been earned." }); return;
      }
      // Recheck after asynchronous entitlement lookup: start/end/host transfer may have happened.
      if (!allowed() || !room) { acknowledge({ ok: false, reason: "Room Style is locked." }); return; }
      room.boardStyle = payload.style; room.updatedAt = Date.now(); queueRoomSave(); emitLobby(io, room.code);
      acknowledge({ ok: true, room: toPublicGameRoom(room) });
    } catch { acknowledge({ ok: false, reason: "Unable to verify board ownership. Try again." }); }
  });
  socket.on(
    "game:preview",
    (
      payload: RoomCodePayload,
      acknowledge: (
        response: RoomPreviewResponse,
      ) => void,
    ) => {
      const code =
        payload.code
          ?.trim()
          .toUpperCase();

      if (!code) {
        acknowledge({
          ok: false,
          reason:
            "A room code is required.",
        });
        return;
      }

      const room = rooms.get(code);

      if (!room) {
        acknowledge({
          ok: false,
          reason:
            "This invite is no longer available.",
        });
        return;
      }

      const activePlayers =
        room.players.filter(
          (player) => !player.hasLeft,
        );

      const host =
        activePlayers.find(
          (player) => player.isHost,
        );

      const roomIsFull =
        activePlayers.length >=
        MAXIMUM_PLAYERS;

      const reason = room.started
        ? "This game has already started."
        : roomIsFull
          ? "This lobby is full."
          : undefined;

      acknowledge({
        ok: true,
        preview: {
          code: room.code,
          ranked: room.ranked,
          blitz: room.blitz,
          started: room.started,
          hostName:
            host?.name ?? "Host",
          playerCount:
            activePlayers.length,
          maximumPlayers:
            MAXIMUM_PLAYERS,
          canJoin: !reason,
          ...(reason
            ? { reason }
            : {}),
        },
      });
    },
  );
  socket.on(
    "game:create",
    async (
      payload: CreateGamePayload,
      acknowledge: (response: GameResponse) => void,
    ) => {
      const playerName = payload.playerName?.trim();
      const code = payload.code?.trim().toUpperCase();
      const blitz = Boolean(payload.blitz);
      const ranked = Boolean(payload.ranked) && !blitz;
      const freeParkingJackpotEnabled =
        ranked
          ? false
          : payload.freeParkingJackpotEnabled ?? false;

      if (!playerName || !code) {
        acknowledge({
          ok: false,
          reason: !playerName
            ? "Player name is required."
            : "Game code is required.",
        });
        return;
      }

      if (rooms.has(code)) {
        acknowledge({
          ok: false,
          reason: "That room code is already in use.",
        });
        return;
      }

      let boardStyle = "classic-board";
      try { boardStyle = (await roomCosmeticState(socket.request as Request)).preferences["mega-board"]; }
      catch { acknowledge({ ok: false, reason: "Unable to verify Room Style. Try again." }); return; }
      if (rooms.has(code) || socket.connected === false) { acknowledge({ ok: false, reason: "Room creation changed. Try again." }); return; }
      const reconnectToken = createRecoveryKey();
      const now = Date.now();
      const hostPlayer: RoomPlayer = {
        id: socket.id,
        name: playerName,
        isHost: true,
        isConnected: true,
        isAi: false,
        aiDifficulty: null,
        hasLeft: false,
        reconnectToken,
        disconnectedAt: null,
      };

      const room = {
        code,
        ranked,
        blitz,
        hostId: socket.id,
        boardStyle,
        players: [hostPlayer],
        started: false,
        gameState: null,
        createdAt: now,
        updatedAt: now,
        hostDisconnectDeadline: null,
        freeParkingJackpotEnabled,
      };

      rooms.set(code, room);
      socket.join(code);
      queueRoomSave();

      acknowledge({
        ok: true,
        code,
        playerId: socket.id,
        reconnectToken,
        room: toPublicGameRoom(room),
      });

      emitLobby(io, code);
      console.log(`Game ${code} created by ${playerName}`);
    },
  );

  socket.on(
    "game:join",
    (
      payload: JoinGamePayload,
      acknowledge: (response: GameResponse) => void,
    ) => {
      const playerName = payload.playerName?.trim();
      const code = payload.code?.trim().toUpperCase();

      if (!playerName || !code) {
        acknowledge({
          ok: false,
          reason: !playerName
            ? "Player name is required."
            : "Game code is required.",
        });
        return;
      }

      const room = rooms.get(code);
      if (!room) {
        acknowledge({ ok: false, reason: "That game room does not exist." });
        return;
      }
      if (room.started) {
        acknowledge({
          ok: false,
          reason: "That game has already started. Use the saved recovery session to rejoin.",
        });
        return;
      }
      if (room.players.length >= MAXIMUM_PLAYERS) {
        const aiIndex = room.players.map((player, index) => ({ player, index })).reverse().find(({ player }) => player.isAi)?.index ?? -1;
        if (aiIndex < 0) {
          acknowledge({ ok: false, reason: "That game room is full." });
          return;
        }
        room.players.splice(aiIndex, 1);
      }
      if (room.players.some((player) => player.isConnected && player.id === socket.id)) {
        acknowledge({ ok: false, reason: "You are already in this room." });
        return;
      }
      if (room.players.some((player) => !player.isAi && player.name.toLowerCase() === playerName.toLowerCase())) {
        acknowledge({
          ok: false,
          reason: "That player name is already being used in this room.",
        });
        return;
      }

      const reconnectToken = createRecoveryKey();
      const newPlayer: RoomPlayer = {
        id: socket.id,
        name: playerName,
        isHost: false,
        isConnected: true,
        isAi: false,
        aiDifficulty: null,
        hasLeft: false,
        reconnectToken,
        disconnectedAt: null,
      };

      room.players.push(newPlayer);
      room.updatedAt = Date.now();
      socket.join(code);
      queueRoomSave();

      acknowledge({
        ok: true,
        code,
        playerId: socket.id,
        reconnectToken,
        room: toPublicGameRoom(room),
      });

      emitLobby(io, code);
      console.log(`${playerName} joined game ${code}`);
    },
  );

  socket.on(
    "game:reconnect",
    (
      payload: ReconnectGamePayload,
      acknowledge: (response: GameResponse) => void,
    ) => {
      const code = payload.code?.trim().toUpperCase();
      const reconnectToken = payload.reconnectToken?.trim();
      const room = code ? rooms.get(code) : undefined;

      if (!code || !reconnectToken || !room) {
        acknowledge({
          ok: false,
          reason: "The saved game session could not be found.",
        });
        return;
      }

      const existingPlayer = room.players.find(
        (candidate) =>
          candidate.reconnectToken ===
          reconnectToken,
      );
      const oldSocketId =
        existingPlayer?.id;

      const result = reconnectRoomPlayer(
        room,
        reconnectToken,
        socket.id,
        payload.playerName?.trim(),
        Boolean(payload.force),
      );

      if (typeof result === "string") {
        acknowledge({ ok: false, reason: result });
        return;
      }

      if (
        oldSocketId &&
        oldSocketId !== socket.id
      ) {
        const previousSocket =
          io.sockets.sockets.get(
            oldSocketId,
          );

        previousSocket?.emit(
          "game:session-replaced",
          {
            code,
            reason:
              "This player session was resumed in another browser.",
          },
        );
        previousSocket?.leave(code);
        previousSocket?.disconnect(true);
      }

      cancelHostGrace(code);
      room.hostDisconnectDeadline = null;
      socket.join(code);
      queueRoomSave();
      emitLobby(io, code);

      if (room.gameState) {
        emitGameState(io, code, room.gameState);
        syncAuctionTimer(io, code);
      }

      acknowledge({
        ok: true,
        code,
        playerId: socket.id,
        reconnectToken,
        room: toPublicGameRoom(room),
        state: publicProgressionState(room.gameState) ?? undefined,
      });

      console.log(
        `${result.player.name} recovered game ${code}.`,
      );
    },
  );


socket.on(
  "game:spectate",
  (
    payload: SpectatePayload,
    acknowledge: (response: GameResponse) => void,
  ) => {
    const code = payload.code?.trim().toUpperCase();
    const room = code ? rooms.get(code) : undefined;

    if (!code || !room?.started || !room.gameState) {
      acknowledge({
        ok: false,
        reason: "Only active games can be spectated.",
      });
      return;
    }

    socket.join(code);
    addSpectator(code, socket.id, payload.playerName ?? "Spectator");
    io.to(code).emit("game:spectators", listSpectators(code));

    acknowledge({
      ok: true,
      code,
      playerId: `spectator:${socket.id}`,
      room: toPublicGameRoom(room),
      state: publicProgressionState(room.gameState),
      spectator: true,
    });
  },
);

socket.on(
  "game:leave-spectator",
  (
    payload: RoomCodePayload,
    acknowledge: (response: GameResponse) => void,
  ) => {
    const code = payload.code?.trim().toUpperCase();
    if (code) {
      const room = rooms.get(code);
      removeSpectator(code, socket.id);

      // If a host forfeited and then leaves spectator mode, hand room ownership
      // to another connected human so the surviving match still has a host.
      if (room?.hostId === socket.id) {
        const currentHost = room.players.find((player) => player.id === socket.id);
        const successor = room.players.find((player) =>
          player.id !== socket.id &&
          !player.hasLeft &&
          !player.isAi &&
          player.isConnected
        );

        if (currentHost?.hasLeft && successor) {
          currentHost.isHost = false;
          successor.isHost = true;
          room.hostId = successor.id;
          room.updatedAt = Date.now();
          queueRoomSave();
          emitLobby(io, code);
        }
      }

      socket.leave(code);
      io.to(code).emit("game:spectators", listSpectators(code));
    }
    acknowledge({ ok: true, code });
  },
);
  socket.on(
    "game:start",
    (
      payload: RoomCodePayload,
      acknowledge: (response: GameResponse) => void,
    ) => {
      const code = payload.code?.trim().toUpperCase();
      const room = code ? rooms.get(code) : undefined;

      if (!code || !room) {
        acknowledge({ ok: false, reason: "That game room does not exist." });
        return;
      }
      if (room.hostId !== socket.id) {
        acknowledge({ ok: false, reason: "Only the host can start the game." });
        return;
      }
      if (room.started) {
        acknowledge({ ok: false, reason: "The game has already started." });
        return;
      }

      const connectedPlayers = room.players.filter(
        (player) =>
          player.isAi ||
          player.isConnected,
      );
      if (connectedPlayers.length < MINIMUM_PLAYERS) {
        acknowledge({
          ok: false,
          reason: `At least ${MINIMUM_PLAYERS} connected players are required.`,
        });
        return;
      }

      room.players = connectedPlayers;
      room.started = true;
      room.updatedAt = Date.now();
      room.gameState = createInitialGameState(
        room.code,
        room.players.map((player) => ({
          id: player.id,
          name: player.name,
          isAi: player.isAi,
          aiDifficulty:
            player.aiDifficulty,
        })),
        {
          freeParkingJackpotEnabled:
            room.freeParkingJackpotEnabled,
          ranked: room.ranked,
          blitz: room.blitz,
          turnTimerSeconds: room.turnTimerSeconds,
        },
      );

      room.gameState.boardStyle = room.boardStyle ?? "classic-board";
      initialiseCardDecks(room.gameState);
      recordActivity(
        room.gameState,
        `Game started with ${room.players.length} players.`,
        "game",
      );

      if (room.blitz) {
        const allocation = allocateBlitzProperties(room.gameState);
        syncSpeedDieRetirement(room.gameState);
        const summary = room.gameState.players
          .map((player) => `${player.name}: ${allocation.assignedByPlayerId[player.id] ?? 0}`)
          .join(" · ");
        recordActivity(
          room.gameState,
          `Blitz shuffled and evenly dealt all ${allocation.totalAssets} ownable assets. ${summary}. Portfolios are random by asset identity with no value/group balancing. Speed Die starts retired because every ownable asset is owned.`,
          "game",
        );
        pushGlobalNotice(room.gameState, {
          kind: "game-mode",
          title: "⚡ Blitz Deal Complete",
          message: `All ${allocation.totalAssets} ownable assets were shuffled and dealt as evenly as possible. Asset identity is fully random; no value or colour-group balancing is applied. The Speed Die starts retired.`,
          presentation: "major",
          durationMs: 5200,
        });
      }
      queueRoomSave();

      const publicRoom = toPublicGameRoom(room);
      acknowledge({
        ok: true,
        code,
        playerId: socket.id,
        room: publicRoom,
        state: publicProgressionState(room.gameState),
      });

      io.to(code).emit("game:started", publicRoom);
      emitGameState(io, code, room.gameState);

      console.log(
        `Game ${code} started with ${room.players.length} players.`,
      );
    },
  );
}
