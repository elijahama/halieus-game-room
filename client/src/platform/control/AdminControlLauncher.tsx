import type { HalieusAccountSummary } from "../../../../shared/platform/accounts";
import "./admin-control-launcher.css";

export function AdminControlLauncher({ account }: { account?: HalieusAccountSummary | null }) {
  if (!account || (account.role !== "owner" && account.role !== "admin")) return null;

  return (
    <a className="hgr-admin-control-launcher" href="/control/" aria-label="Open HGR Control administration hub">
      <img className="hgr-admin-control-mark" src="/control/control-icon.png?v=part26-control-approved2" alt="" aria-hidden="true" />
      <span><small>ADMIN</small><strong>Control</strong></span>
    </a>
  );
}
