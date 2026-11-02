import type { HalieusGameInviteSummary, HalieusGameRequestSummary, HalieusFriendRequest } from "../../../shared/platform/accounts";
import type { HalieusGuildInvitation, HalieusGuildMessageNotification } from "../../../shared/platform/guilds";
import type { HgrSocialActivityNotice } from "./socialActivityTransitions";

export type HgrInboxTimelineEntry =
  | { kind:"social"; key:string; at:number; notice:HgrSocialActivityNotice }
  | { kind:"request"; key:string; at:number; request:HalieusGameRequestSummary }
  | { kind:"room"; key:string; at:number; invite:HalieusGameInviteSummary }
  | { kind:"guild-message"; key:string; at:number; notice:HalieusGuildMessageNotification }
  | { kind:"friend"; key:string; at:number; request:HalieusFriendRequest }
  | { kind:"guild-invite"; key:string; at:number; invite:HalieusGuildInvitation };

/** One newest-first inbox across all event categories, stable for identical timestamps. */
export function buildInboxTimeline(args:{
  social:readonly HgrSocialActivityNotice[];
  requests:readonly HalieusGameRequestSummary[];
  roomInvites:readonly HalieusGameInviteSummary[];
  guildMessages:readonly HalieusGuildMessageNotification[];
  friendRequests:readonly HalieusFriendRequest[];
  guildInvites:readonly HalieusGuildInvitation[];
}):HgrInboxTimelineEntry[] {
  return [
    ...args.social.map(notice=>({kind:"social" as const,key:"social:"+notice.id,at:notice.at,notice})),
    ...args.requests.map(request=>({kind:"request" as const,key:"request:"+request.id,at:request.createdAt,request})),
    ...args.roomInvites.map(invite=>({kind:"room" as const,key:"room:"+invite.id,at:invite.createdAt,invite})),
    ...args.guildMessages.map(notice=>({kind:"guild-message" as const,key:notice.key,at:notice.createdAt,notice})),
    ...args.friendRequests.map(request=>({kind:"friend" as const,key:"friend:"+request.id,at:request.createdAt,request})),
    ...args.guildInvites.map(invite=>({kind:"guild-invite" as const,key:"guild-invite:"+invite.id,at:invite.createdAt,invite})),
  ].sort((a,b)=>b.at-a.at || a.key.localeCompare(b.key));
}
export function inboxUnreadCount(events:readonly HgrInboxTimelineEntry[],readKeys:ReadonlySet<string>,guildReads:ReadonlySet<string>):number {
  return events.filter(event=>event.kind==="social" ? !event.notice.read
    : event.kind==="guild-message" ? !guildReads.has(event.key)
    : !readKeys.has(event.key)).length;
}
