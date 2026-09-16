import { io } from "socket.io-client";

const configuredServerUrl =
  import.meta.env.VITE_SERVER_URL?.trim();

const serverUrl =
  configuredServerUrl ||
  (import.meta.env.DEV
    ? "http://localhost:3000"
    : window.location.origin);

export const socket = io(serverUrl, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 750,
  reconnectionDelayMax: 5000,
  timeout: 10000,
});
