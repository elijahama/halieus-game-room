import cors from "cors";
import express, {
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
import { resolve } from "node:path";
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
import { getPokerRoomCount, registerPokerHandlers } from "./games/poker/handlers.js";
import { registerRankedHandlers } from "./games/mega-board/handlers/rankedHandlers.js";
import { registerSpeedDieHandlers } from "./games/mega-board/handlers/speedDieHandlers.js";
import { registerSessionHandlers } from "./games/mega-board/handlers/sessionHandlers.js";
import { registerTradeHandlers } from "./games/mega-board/handlers/tradeHandlers.js";
import { registerTurnHandlers } from "./games/mega-board/handlers/turnHandlers.js";
import { rooms } from "./games/mega-board/state/rooms.js";
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

const APP_VERSION = "0.22.9-rc.3.3.26";

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
  "http://localhost:5173"
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

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);

app.use(express.json());

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

const feedbackDataDirectory =
  resolve(
    process.cwd(),
    "data",
  );

const feedbackFilePath =
  resolve(
    feedbackDataDirectory,
    "feedback.ndjson",
  );

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
    status: "online",
    activeRooms: rooms.size,
    activePokerRooms: getPokerRoomCount(),
    uptimeSeconds: Math.floor(
      process.uptime(),
    ),
    publicAppUrl: PUBLIC_APP_URL,
  });
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

  registerPokerHandlers(io, socket);
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
