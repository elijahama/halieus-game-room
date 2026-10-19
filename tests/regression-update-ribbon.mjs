import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base=new URL("../client/src/platform/components/",import.meta.url);
const [tsx,css]=await Promise.all([
  readFile(new URL("PlatformMaintenanceBanner.tsx",base),"utf8"),
  readFile(new URL("PlatformMaintenanceBanner.css",base),"utf8")
]);
assert.match(tsx,/dismissedNoticeId === notice\.id/);
assert.match(tsx,/setDismissedNoticeId\(notice\.id\)/);
assert.match(tsx,/aria-label="Dismiss update ribbon"/);
assert.match(tsx,/recovery key or room code/i,"Keep essential live-game recovery advice in the ticker");
assert.match(tsx,/className="halieus-maintenance-ticker"/);
assert.match(tsx,/isReloading \|\| isRefreshRequired \? "is-complete"/);
assert.match(tsx,/navigateToRelease\(releaseTarget\)/);
assert.match(tsx,/const pollForRelease = async/);
assert.match(css,/top:\s*0;/);
assert.match(css,/width:\s*100%/);
assert.match(css,/@keyframes hgr-ribbon-scroll/);
assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
assert.doesNotMatch(css,/maintenance-spin|rotate\(360deg\)/);
assert.match(css,/is-restarting[\s\S]*?hgr-ribbon-pulse/);
console.log("PASS update ribbon is top-edge, dismissible, motion-aware, and release navigation remains intact");
