import { useEffect, useState } from "react";
export function NotificationPermissionButton() {
  const supported = typeof Notification !== "undefined";
  const [permission, setPermission] = useState<NotificationPermission>(supported ? Notification.permission : "denied");
  useEffect(() => { if (supported) setPermission(Notification.permission); }, [supported]);
  if (!supported || permission === "granted") return null;
  return <button type="button" className="halieus-install-app" onClick={async () => { const result = await Notification.requestPermission(); setPermission(result); }}><span>◌</span><b>{permission === "denied" ? "Notifications blocked" : "Enable notifications"}</b></button>;
}
