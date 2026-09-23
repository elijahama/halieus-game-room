import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { existsSync } from "node:fs";
import {
  appendFile,
  mkdir,
} from "node:fs/promises";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { dirname, resolve } from "node:path";
import {
  Server,
  type Socket,
} from "socket.io";

import { startAiCoordinator } from "./games/mega-board/ai/ai-engine.js";
import { registerAiLobbyHandlers } from "./games/mega-board/handlers/aiLobbyHandlers.js";
import { registerAssetHandlers } from "./games/mega-board/handlers/assetHandlers.js";
import { registerAutopilotHandlers } from "./games/mega-board/handlers/autopilotHandlers.js";
import { registerAuctionHandlers } from "./games/mega-board/handlers/auctionHandlers.js";
import { registerBankruptcyHandlers } from "./games/mega-board/handlers/bankruptcyHandlers.js";
import { registerBuildingHandlers } from "./games/mega-board/handlers/buildingHandlers.js";
import { registerCardHandlers } from "./games/mega-board/handlers/cardHandlers.js";
import { registerDisconnectHandler } from "./games/mega-board/handlers/disconnectHandler.js";
import { registerDepotHandlers } from "./games/mega-board/handlers/depotHandlers.js";
import { registerGameplayHandlers } from "./games/mega-board/handlers/gameplayHandlers.js";
import { registerJailHandlers } from "./games/mega-board/handlers/jailHandlers.js";
import { registerLobbyHandlers } from "./games/mega-board/handlers/lobbyHandlers.js";
import { registerMegaSpaceHandlers } from "./games/mega-board/handlers/megaSpaceHandlers.js";
import { registerOrderHandlers } from "./games/mega-board/handlers/orderHandlers.js";
import { registerPurchaseHandlers } from "./games/mega-board/handlers/purchaseHandlers.js";
import { closeAllPokerRooms, getPokerChatIdentity, getPokerLiveRoomSummaries, getPokerRoomCount, registerPokerHandlers } from "./games/poker/handlers.js";
import { closeAllLudoRooms, getLudoChatIdentity, getLudoLiveRoomSummaries, getLudoRoomCount, registerLudoHandlers } from "./games/ludo/handlers.js";
import { closeAllConnectFourRooms, getConnectFourChatIdentity, getConnectFourLiveRoomSummaries, getConnectFourRoomCount, registerConnectFourHandlers } from "./games/connect-four/handlers.js";
import { closeAllHiddenDictatorRooms, getHiddenDictatorChatIdentity, getHiddenDictatorLiveRoomSummaries, getHiddenDictatorRoomCount, registerHiddenDictatorHandlers } from "./games/hidden-dictator/handlers.js";
import { closeAllWordArenaRooms, getWordArenaChatIdentity, getWordArenaLiveRoomSummaries, getWordArenaRoomCount, registerWordArenaHandlers } from "./games/word-arena/handlers.js";
import { closeAllClassicRooms, getClassicChatIdentity, getClassicLiveRoomSummaries, getClassicRoomCount, registerClassicTableHandlers } from "./games/classic-table/handlers.js";
import { closeAllAyoRooms, getAyoChatIdentity, getAyoLiveRoomSummaries, getAyoRoomCount, registerAyoHandlers } from "./games/ayo/handlers.js";
import { closeAllWordBoardRooms, getWordBoardChatIdentity, getWordBoardLiveRoomSummaries, getWordBoardRoomCount, registerWordBoardHandlers } from "./games/word-board/handlers.js";
import { closeAllBlackjackRooms, getBlackjackChatIdentity, getBlackjackLiveRoomSummaries, getBlackjackRoomCount, registerBlackjackHandlers } from "./games/blackjack/rebuild.js";
import { closeAllWhotRooms, getWhotChatIdentity, getWhotLiveRoomSummaries, getWhotRoomCount, registerWhotHandlers } from "./games/whot/rebuild.js";
import { getSessionArchiveStatus } from "./platform/sessionArchive.js";
import { APP_VERSION } from "../../shared/version.js";
import { RELEASE_FINGERPRINT } from "../../shared/release.js";
import { getFeedbackFilePath } from "./platform/dataPaths.js";
import { registerRoomChatHandlers } from "./platform/roomChat.js";
import { configureAccountAdminRuntimeControls, getAccountSummaryById, getAuthenticatedAccount, hasAdminSession, loadAccountStore, registerAccountRoutes } from "./platform/accounts.js";
import { loadGuildStore, registerGuildRoutes } from "./platform/guilds.js";
import { registerRankedHandlers } from "./games/mega-board/handlers/rankedHandlers.js";
import { registerSpeedDieHandlers } from "./games/mega-board/handlers/speedDieHandlers.js";
import { registerSessionHandlers } from "./games/mega-board/handlers/sessionHandlers.js";
import { registerTradeHandlers } from "./games/mega-board/handlers/tradeHandlers.js";
import { registerTurnHandlers } from "./games/mega-board/handlers/turnHandlers.js";
import { rooms } from "./games/mega-board/state/rooms.js";
import { listSpectators } from "./games/mega-board/state/spectators.js";
import { syncAuctionTimer } from "./games/mega-board/utils/auction-timer.js";
import { restoreHostGraceTimers } from "./games/mega-board/utils/host-grace.js";
import {
  flushRoomSave,
  getSavePath,
  loadRoomsFromDisk,
} from "./games/mega-board/utils/persistence.js";
import {
  finalizeRankedMatch,
  flushRankingsSave,
  getRankingsPath,
  loadRankingsFromDisk,
} from "./games/mega-board/utils/rankings.js";

const parsedPort = Number.parseInt(
  process.env.PORT ?? "3000",
  10,
);
const PORT = Number.isFinite(parsedPort)
  ? parsedPort
  : 3000;

function normaliseOrigin(
  value: string | undefined,
): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

const PUBLIC_APP_URL = normaliseOrigin(
  process.env.PUBLIC_APP_URL,
);

const clientOrigins = (
  process.env.CLIENT_ORIGINS ??
  "https://halieus.remotewire.net,http://localhost:5173,http://localhost:3000,http://127.0.0.1:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowEveryOrigin =
  clientOrigins.includes("*");
const corsOrigin = allowEveryOrigin
  ? true
  : clientOrigins;

const app = express();
app.set("trust proxy", 1);

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);

// Profile pictures are sent as Base64 data URLs. A raw image under the
// 1 MB profile limit expands to roughly 1.33 MB in JSON, so Express's default
// 100 KB parser ceiling incorrectly rejects otherwise-valid profile updates.
app.use(express.json({ limit: "2mb" }));

// Keep the private game portal reachable by direct link while instructing
// compliant search engines not to index, cache or surface it in snippets.
app.use(
  (
    _request: Request,
    response: Response,
    next: () => void,
  ) => {
    response.setHeader(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive, nosnippet, noimageindex",
    );
    response.setHeader(
      "Referrer-Policy",
      "no-referrer",
    );
    next();
  },
);

// Account responses contain private profile/session information and must never
// be stored by a browser or shared cache. Apply headers before route handlers.
app.use(["/auth", "/accounts", "/admin", "/guilds"], (_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});
registerAccountRoutes(app);
registerGuildRoutes(app, getAuthenticatedAccount, getAccountSummaryById);

const feedbackFilePath = getFeedbackFilePath();
const feedbackDataDirectory = dirname(feedbackFilePath);

app.post(
  "/feedback",
  async (
    request: Request,
    response: Response,
  ) => {
    const category =
      typeof request.body?.category ===
      "string"
        ? request.body.category
            .trim()
            .slice(0, 80)
        : "Other";

    const details =
      typeof request.body?.details ===
      "string"
        ? request.body.details
            .trim()
            .slice(0, 4000)
        : "";

    const roomCode =
      typeof request.body?.roomCode ===
      "string"
        ? request.body.roomCode
            .trim()
            .toUpperCase()
            .slice(0, 12)
        : "";

    const playerName =
      typeof request.body?.playerName ===
      "string"
        ? request.body.playerName
            .trim()
            .slice(0, 80)
        : "Unknown player";

    const pageUrl =
      typeof request.body?.pageUrl ===
      "string"
        ? request.body.pageUrl
            .trim()
            .slice(0, 500)
        : "";

    const userAgent =
      typeof request.body?.userAgent ===
      "string"
        ? request.body.userAgent
            .trim()
            .slice(0, 500)
        : "";

    if (details.length < 4) {
      response.status(400).json({
        ok: false,
        reason:
          "Feedback details are required.",
      });
      return;
    }

    const entry = {
      id:
        `feedback-${Date.now()}-` +
        Math.random()
          .toString(36)
          .slice(2, 8),
      submittedAt:
        new Date().toISOString(),
      category,
      details,
      roomCode,
      playerName,
      pageUrl,
      userAgent,
      appVersion: APP_VERSION,
    };

    try {
      await mkdir(
        feedbackDataDirectory,
        { recursive: true },
      );

      await appendFile(
        feedbackFilePath,
        JSON.stringify(entry) +
          "\n",
        "utf8",
      );

      console.log(
        `Feedback received: ${category}` +
          (
            roomCode
              ? ` [room ${roomCode}]`
              : ""
          ),
      );

      response.status(201).json({
        ok: true,
        feedbackId: entry.id,
      });
    } catch (error) {
      console.error(
        "Unable to save feedback:",
        error,
      );

      response.status(500).json({
        ok: false,
        reason:
          "Feedback could not be saved.",
      });
    }
  },
);

app.get(
  "/health",
  (
    _request: Request,
    response: Response,
  ) => {
  response.json({
    name: "Halieus Game Room Server",
    version: APP_VERSION,
    releaseFingerprint: RELEASE_FINGERPRINT,
    status: "online",
    activeRooms: rooms.size,
    activePokerRooms: getPokerRoomCount(),
    activeBlackjackRooms: getBlackjackRoomCount(),
    activeWhotRooms: getWhotRoomCount(),
    activeClassicRooms: getClassicRoomCount(),
    retiredModules: [],
    activeLudoRooms: getLudoRoomCount(),
    activeConnectFourRooms: getConnectFourRoomCount(),
    activeHiddenDictatorRooms: getHiddenDictatorRoomCount(),
    activeWordArenaRooms: getWordArenaRoomCount(),
    connectedClients: io.engine.clientsCount,
    uptimeSeconds: Math.floor(
      process.uptime(),
    ),
    publicAppUrl: PUBLIC_APP_URL,
  });
  },
);

app.get(
  "/session-archive/status",
  async (request: Request, response: Response) => {
    if (!hasAdminSession(request)) {
      response.status(403).json({ ok: false, reason: "Administrator access is required." });
      return;
    }
    try {
      response.json({ ok: true, ...(await getSessionArchiveStatus()) });
    } catch (error) {
      console.error("Unable to read session archive status:", error);
      response.status(500).json({ ok: false, reason: "Session archive status is unavailable." });
    }
  },
);

function isPrivateIpv4(
  address: string,
): boolean {
  const octets = address
    .split(".")
    .map((value) =>
      Number.parseInt(value, 10),
    );

  if (
    octets.length !== 4 ||
    octets.some(
      (value) =>
        !Number.isInteger(value) ||
        value < 0 ||
        value > 255,
    )
  ) {
    return false;
  }

  return (
    octets[0] === 10 ||
    (
      octets[0] === 172 &&
      octets[1] >= 16 &&
      octets[1] <= 31
    ) ||
    (
      octets[0] === 192 &&
      octets[1] === 168
    )
  );
}

function interfacePriority(
  interfaceName: string,
): number {
  const normalised =
    interfaceName.toLowerCase();

  if (
    normalised.includes("wi-fi") ||
    normalised.includes("wifi") ||
    normalised.includes("wlan") ||
    normalised.includes("wireless")
  ) {
    return 0;
  }

  if (
    normalised.includes("ethernet") &&
    !normalised.includes("vmware") &&
    !normalised.includes("virtual")
  ) {
    return 1;
  }

  return 2;
}

function isVirtualInterface(
  interfaceName: string,
): boolean {
  return /vmware|virtual|vbox|hyper-v|tailscale|bluetooth|loopback/i.test(
    interfaceName,
  );
}

app.get(
  "/invite-origins",
  (
    request: Request,
    response: Response,
  ) => {
  const forwardedProtocol =
    request
      .header("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();

  const protocol =
    forwardedProtocol ||
    request.protocol ||
    "http";

  const currentHost =
    request.get("host") ??
    `localhost:${PORT}`;

  const currentOrigin =
    `${protocol}://${currentHost}`;

  const candidates = Object.entries(
    networkInterfaces(),
  )
    .flatMap(
      ([interfaceName, addresses]) =>
        (addresses ?? [])
          .filter(
            (address) =>
              address.family === "IPv4" &&
              !address.internal &&
              isPrivateIpv4(
                address.address,
              ) &&
              !isVirtualInterface(
                interfaceName,
              ),
          )
          .map((address) => ({
            interfaceName,
            address: address.address,
            priority:
              interfacePriority(
                interfaceName,
              ),
          })),
    )
    .sort(
      (left, right) =>
        left.priority -
          right.priority ||
        left.interfaceName.localeCompare(
          right.interfaceName,
        ),
    );

  const localOrigins =
    candidates.map((candidate) => ({
      label:
        `${candidate.interfaceName} ` +
        `(${candidate.address})`,
      origin:
        `${protocol}://${candidate.address}:${PORT}`,
    }));

  const origins = [
    ...(PUBLIC_APP_URL
      ? [
          {
            label:
              "Public game address",
            origin: PUBLIC_APP_URL,
          },
        ]
      : []),
    {
      label: "This browser",
      origin: currentOrigin,
    },
    ...localOrigins,
  ].filter(
    (candidate, index, all) =>
      all.findIndex(
        (item) =>
          item.origin === candidate.origin,
      ) === index,
  );

  response.json({
    currentOrigin,
    preferredOrigin:
      PUBLIC_APP_URL ??
      localOrigins[0]?.origin ??
      currentOrigin,
    publicOrigin: PUBLIC_APP_URL,
    origins,
  });
  },
);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 20000,
});

const getMegaBoardLiveRoomCount = () => [...rooms.values()].filter((room) => room.gameState?.phase !== "finished" && room.players.some((player) => !player.isAi && player.isConnected && !player.hasLeft)).length;
const getMegaBoardLiveRoomSummaries = () => [...rooms.values()]
  .filter((room) => room.gameState?.phase !== "finished" && (room.players.some((player) => !player.isAi && player.isConnected && !player.hasLeft) || listSpectators(room.code).length > 0))
  .map((room) => ({
    game: "mega-board" as const,
    gameTitle: "Mega Board",
    code: room.code,
    phase: room.started ? (room.gameState?.phase ?? "playing") : "lobby",
    matchMode: room.blitz ? "blitz" as const : room.ranked ? "ranked" as const : "casual" as const,
    started: room.started,
    createdAt: room.createdAt,
    startedAt: room.gameState?.gameStartedAt ?? null,
    updatedAt: room.updatedAt,
    playerCount: room.players.filter((player) => !player.hasLeft).length,
    maximumPlayers: 8,
    humanPlayers: room.players.filter((player) => !player.isAi && player.isConnected && !player.hasLeft).map((player) => player.name),
    aiCount: room.players.filter((player) => player.isAi && !player.hasLeft).length,
    spectatorCount: listSpectators(room.code).length,
    joinable: !room.started && room.players.filter((player) => !player.hasLeft).length < 8,
    spectatable: room.started,
  }));

configureAccountAdminRuntimeControls({
  getRoomCount: () => getMegaBoardLiveRoomCount() + getPokerRoomCount() + getBlackjackRoomCount() + getWhotRoomCount() + getLudoRoomCount() + getConnectFourRoomCount() + getHiddenDictatorRoomCount() + getWordArenaRoomCount() + getClassicRoomCount() + getAyoRoomCount() + getWordBoardRoomCount(),
  getLiveRooms: () => [
    ...getMegaBoardLiveRoomSummaries(),
    ...getPokerLiveRoomSummaries(),
    ...getBlackjackLiveRoomSummaries(),
    ...getWhotLiveRoomSummaries(),
    ...getClassicLiveRoomSummaries(),
    ...getLudoLiveRoomSummaries(),
    ...getConnectFourLiveRoomSummaries(),
    ...getHiddenDictatorLiveRoomSummaries(),
    ...getWordArenaLiveRoomSummaries(),
    ...getAyoLiveRoomSummaries(),
    ...getWordBoardLiveRoomSummaries(),
  ],
  closeAllRooms: async (actor) => {
    const closed = getMegaBoardLiveRoomCount() + getPokerRoomCount() + getBlackjackRoomCount() + getWhotRoomCount() + getLudoRoomCount() + getConnectFourRoomCount() + getHiddenDictatorRoomCount() + getWordArenaRoomCount() + getClassicRoomCount() + getAyoRoomCount() + getWordBoardRoomCount();
    io.emit("platform:all-rooms-closed", {
      reason: `${actor.displayName} closed all live rooms from Player Management.`,
      at: Date.now(),
    });
    rooms.clear();
    closeAllPokerRooms();
    closeAllBlackjackRooms();
    closeAllWhotRooms();
    closeAllClassicRooms();
    closeAllLudoRooms();
    closeAllConnectFourRooms();
    closeAllHiddenDictatorRooms();
    closeAllWordArenaRooms();
    closeAllAyoRooms();
    closeAllWordBoardRooms();
    await flushRoomSave();
    return { closed };
  },
});

io.on(
  "connection",
  (socket: Socket) => {
  console.log(
    `Player connected: ${socket.id}`,
  );

  socket.emit("server:ready", {
    message:
      "Connected to Halieus Game Room Server",
  });

  registerRoomChatHandlers(io, socket, {
    "mega-board": (code, socketId) => {
      const room = rooms.get(code);
      const player = room?.players.find((candidate) => candidate.id === socketId && candidate.isConnected && !candidate.hasLeft);
      if (player) return { name: player.name, role: "player" };
      const spectator = listSpectators(code).find((candidate) => candidate.id === socketId);
      return spectator ? { name: spectator.name, role: "spectator" } : null;
    },
    poker: getPokerChatIdentity,
    blackjack: getBlackjackChatIdentity,
    whot: getWhotChatIdentity,
    ludo: getLudoChatIdentity,
    "connect-four": getConnectFourChatIdentity,
    "hidden-dictator": getHiddenDictatorChatIdentity,
    "word-game": (code, socketId) => getWordArenaChatIdentity("word-game", code, socketId),
    password: (code, socketId) => getWordArenaChatIdentity("password", code, socketId),
    "anagrams-race": (code, socketId) => getWordArenaChatIdentity("anagrams-race", code, socketId),
    cheat: (code, socketId) => getClassicChatIdentity("cheat", code, socketId),
    dominoes: (code, socketId) => getClassicChatIdentity("dominoes", code, socketId),
    ayo: getAyoChatIdentity,
    "word-board": getWordBoardChatIdentity,
  });

  registerPokerHandlers(io, socket);
  registerBlackjackHandlers(io, socket);
  registerWhotHandlers(io, socket);
  registerClassicTableHandlers(io, socket);
  registerLudoHandlers(io, socket);
  registerConnectFourHandlers(io, socket);
  registerHiddenDictatorHandlers(io, socket);
  registerWordArenaHandlers(io, socket);
  registerAyoHandlers(io, socket);
  registerWordBoardHandlers(io, socket);
  registerLobbyHandlers(io, socket);
  registerAiLobbyHandlers(io, socket);
  registerOrderHandlers(io, socket);
  registerGameplayHandlers(io, socket);
  registerMegaSpaceHandlers(io, socket);
  registerSpeedDieHandlers(io, socket);
  registerSessionHandlers(io, socket);
  registerJailHandlers(io, socket);
  registerPurchaseHandlers(io, socket);
  registerRankedHandlers(io, socket);
  registerTradeHandlers(io, socket);
  registerTurnHandlers(io, socket);
  registerBuildingHandlers(io, socket);
  registerDepotHandlers(io, socket);
  registerBankruptcyHandlers(io, socket);
  registerCardHandlers(io, socket);
  registerAssetHandlers(io, socket);
  registerAutopilotHandlers(io, socket);
  registerAuctionHandlers(io, socket);
  registerDisconnectHandler(io, socket);
  },
);

await loadAccountStore();
await loadGuildStore();

const recoveredRoomCount =
  await loadRoomsFromDisk();
const recoveredRankedPlayers =
  await loadRankingsFromDisk();

let recoveredRankedMatches = 0;
for (const room of rooms.values()) {
  if (room.ranked && room.gameState?.phase === "finished" && !room.gameState.rankedProcessed) {
    if (finalizeRankedMatch(room.gameState)) recoveredRankedMatches += 1;
  }
}
if (recoveredRankedMatches > 0) {
  await Promise.all([flushRoomSave(), flushRankingsSave()]);
}

const aiCoordinator =
  startAiCoordinator(io);

for (const code of rooms.keys()) {
  syncAuctionTimer(io, code);
}

restoreHostGraceTimers(io);

process.on("SIGINT", async () => {
  clearInterval(aiCoordinator);
  await Promise.all([flushRoomSave(), flushRankingsSave()]);
  process.exit(0);
});

process.on("SIGTERM", async () => {
  clearInterval(aiCoordinator);
  await Promise.all([flushRoomSave(), flushRankingsSave()]);
  process.exit(0);
});

const shouldServeClient =
  process.env.SERVE_CLIENT === "true";
const clientDistPath = resolve(
  process.cwd(),
  "../client/dist",
);

const canServeClient =
  shouldServeClient &&
  existsSync(clientDistPath);

if (canServeClient) {
  // Never let an old HTML shell pin the browser to an obsolete compiled client.
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.path === "/" || request.path.endsWith(".html")) {
      response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      response.setHeader("Pragma", "no-cache");
      response.setHeader("Expires", "0");
    }
    next();
  });

  app.use(
    express.static(clientDistPath),
  );

  app.get(
    "*",
    (
      _request: Request,
      response: Response,
    ) => {
    response.sendFile(
      resolve(
        clientDistPath,
        "index.html",
      ),
    );
    },
  );
} else {
  app.get(
    "/",
    (
      _request: Request,
      response: Response,
    ) => {
    response.json({
      name: "Halieus Game Room Server",
      version: APP_VERSION,
      releaseFingerprint: RELEASE_FINGERPRINT,
      status: "online",
      health: "/health",
      servingClient: false,
    });
    },
  );
}

httpServer.listen(PORT, () => {
  console.log(
    "🎮 Halieus Game Room Server",
  );

  console.log(
    `Listening on port ${PORT}`,
  );
  console.log(
    `Recovered rooms: ${recoveredRoomCount}`,
  );
  console.log(
    `Save file: ${getSavePath()}`,
  );
  console.log(`Ranked players: ${recoveredRankedPlayers}`);
  console.log(`Recovered unscored Ranked matches: ${recoveredRankedMatches}`);
  console.log(`Rankings file: ${getRankingsPath()}`);
  console.log(
    `Serving client: ${canServeClient}`,
  );
});
