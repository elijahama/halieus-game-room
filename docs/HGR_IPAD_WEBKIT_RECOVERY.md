# HGR iPad / WebKit connection recovery

## 4.5.4.11 hotfix

Owner QA on 4 October 2026 captured a real iPad Safari failure where `https://halieus.remotewire.net` first painted as a blank page and then remained indefinitely on the static Halieus boot curtain. Closing tabs did not resolve the problem.

The important diagnostic distinction is that the Halieus boot curtain is delivered directly in `client/index.html`; React removes it only after the initial `/auth/status` request either succeeds or fails. Before this hotfix, `accountApi()` had no timeout, so a WebKit fetch that remained unresolved could leave the curtain on screen forever even though the HTML document itself had loaded.

### Durable client rules

1. The initial `GET /auth/status` bootstrap is a bounded request. It may not keep the first-paint curtain indefinitely.
2. That bootstrap bypasses browser cache state and receives one fresh retry if the first transport attempt stalls or fails before a response arrives.
3. If both bounded attempts fail, the request becomes a normal visible account/network error. The existing first-paint contract then releases the boot curtain instead of trapping the user behind branding.
4. Account mutations and unrelated account requests keep their existing semantics; the short timeout/retry is scoped to initial `/auth/status` bootstrap only.
5. iPad/iPhone WebKit, including desktop-class iPadOS user agents (`MacIntel` plus touch points), receives lifecycle recovery for `pageshow`, `visibilitychange`, and `online`.
6. A BFCache restore or meaningful iPadOS background suspension is allowed to discard a Socket.IO transport that still claims to be connected and establish a fresh transport. Ordinary foreground traffic is not periodically reset.
7. This hotfix does not change game authority, room recovery rules, service-worker cache policy, Control, fullscreen, or game UI.

### Acceptance

After deployment, validate on the affected iPad in Safari:

- a fresh navigation must leave the Halieus boot curtain and reach the normal account/home UI;
- background Safari for several seconds and return; the page must recover without a permanent `Connecting...` state;
- return through Safari history/BFCache and verify Socket.IO reconnects if the old transport was suspended;
- switch Wi-Fi off/on or otherwise trigger browser `online` recovery and verify the existing page reconnects without requiring all tabs to be closed;
- repeat once from an installed HGR PWA if available.

Source/CI success remains separate from this real-device acceptance.
