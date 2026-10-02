import { useEffect, useState } from "react";
import type { HalieusAuthStatus } from "../../../../shared/platform/accounts";

import "./admin-control-launcher.css";

export function AdminControlLauncher() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/auth/status", { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } })
      .then(async (response) => response.ok ? await response.json() as HalieusAuthStatus : null)
      .then((status) => {
        if (cancelled || !status?.authenticated || !status.account) return;
        setVisible(status.account.role === "owner" || status.account.role === "admin");
      })
      .catch(() => { if (!cancelled) setVisible(false); });
    return () => { cancelled = true; };
  }, []);

  if (!visible) return null;

  return (
    <a className="hgr-admin-control-launcher" href="/control/" aria-label="Open HGR Control administration hub">
      <span className="hgr-admin-control-mark" aria-hidden="true">H</span>
      <span><small>ADMIN</small><strong>Control</strong></span>
    </a>
  );
}
