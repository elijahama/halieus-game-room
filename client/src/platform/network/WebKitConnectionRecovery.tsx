import { useEffect } from "react";

import { socket } from "./sockets";

function isAppleTouchWebKit(): boolean {
  const userAgent = navigator.userAgent || "";
  const classicIos = /iPad|iPhone|iPod/i.test(userAgent);
  const desktopClassIpad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return classicIos || desktopClassIpad;
}

/**
 * iPadOS/WebKit can resume a suspended page while Socket.IO still believes the
 * old transport is connected. Recover only at browser lifecycle boundaries so
 * ordinary foreground traffic is untouched.
 */
export function WebKitConnectionRecovery() {
  useEffect(() => {
    const appleTouchWebKit = isAppleTouchWebKit();
    let hiddenAt = 0;
    let reconnectTimer = 0;

    const reconnect = (forceFreshTransport: boolean) => {
      if (document.visibilityState === "hidden" || navigator.onLine === false) return;
      window.clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(() => {
        if (forceFreshTransport && socket.connected) socket.disconnect();
        if (!socket.connected) socket.connect();
      }, 80);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      const suspendedFor = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = 0;
      reconnect(appleTouchWebKit && suspendedFor >= 1_500);
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      reconnect(appleTouchWebKit && event.persisted);
    };

    const handleOnline = () => reconnect(false);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("online", handleOnline);

    return () => {
      window.clearTimeout(reconnectTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
