import type { HalieusLiveGameId } from "./live-games.js";

/** Social-contact-only public data. No room token, account email or hidden role. */
export interface HgrSocialActivityEntry {
  accountId: string;
  displayName: string;
  online: boolean;
  game: { id: HalieusLiveGameId; title: string; started: boolean; code: string } | null;
}
export interface HgrSocialActivitySnapshot {
  ok: true;
  entries: HgrSocialActivityEntry[];
}
