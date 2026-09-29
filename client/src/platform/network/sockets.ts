import { io } from "socket.io-client";

const configuredServerUrl =
  import.meta.env.VITE_SERVER_URL?.trim();

export const serverUrl =
  configuredServerUrl ||
  (import.meta.env.DEV
    ? "http://localhost:3000"
    : window.location.origin);

export const socket = io(serverUrl, {
  autoConnect: false,
  transports: ["polling", "websocket"],
  tryAllTransports: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 750,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  upgrade: true,
  rememberUpgrade: false,
});
