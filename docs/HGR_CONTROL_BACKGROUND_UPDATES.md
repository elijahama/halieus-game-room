# HGR Control — Portrait fullscreen and background Update notifications

**Development candidate:** 4.6.11 Control usability hotfix, independently reviewed
from ongoing 4.7.0 Guild fixture work. The candidate's authoritative VERSION is 4.6.11; the public/main
release remains at 4.6.10 until review, merge and actual deployment. No production deploy here.

## Fullscreen

The Control topbar always displays a discoverable **Full Screen** control on
portrait/mobile screens. On Android (including installed PWAs), a supported
Fullscreen API receives the actual user tap. The previous unconditional
`display-mode: standalone` exclusion is removed. Unsupported browsers,
including iOS/iPadOS safety cases, see a truthful disabled explanation, not
a fake success or a missing button. Small screens preserve a 44px tap target
without moving the five mobile Control tabs or modifying branding assets.

## Progress after switching to other applications

An owner/admin may explicitly select **Enable update alerts** in
**Control → Operations → Update notifications** on their phone.
Permission is requested only after a tap; subscriptions are bound to the
signed-in account and the **Control-scoped service worker**, not the main
Game Room's separate invitation/message subscription.

The Oracle Control server sends **opt-in Web Push** notifications only to
the owner/admin account that authorised an update. Each notification is
derived from the *authenticated owner-PC bridge's persisted report*, at
initial progress and up to four threshold milestones (25%, 50%, 75%, 95%),
then succeeded/failed/rejected. The actual reported percentage is displayed;
progress is never fabricated. Push notices share a tag per update so the
operating system can replace the current notification instead of piling up
dozens. The lock-screen body is deliberately generic; detailed phases,
failure reasons, local file paths and credentials stay within signed-in
Control. Tapping opens/focuses `/control/`, where the authoritative
operation status is restored. The **Send test alert** button uses the
existing rate-limited, account-bound notification test endpoint.

### Limitations / acceptance

Android and browser notification settings, battery restrictions and push
provider delivery mean notifications are **best-effort** and may be grouped,
delayed or blocked. This is not a continuously animated Android foreground
service or a guaranteed OS-level progress bar. Control can display fine
grained progress when active; the remote owner-PC updater itself continues
independently if the page is backgrounded. Agent progress reports and final
receipts remain authoritative. If the agent disappears before reporting a
terminal result, Control's durable operation history remains the fallback.

## Security and testing

- Only approved Control owners/admins can subscribe to `operations` push.
- An ordinary player cannot opt into privileged Update progress.
- Push and click URLs are restricted to the same-origin Control path.
- No server-side operational tokens or command output is sent to push.
- Existing `invites`/`messages` topics are preserved; no permissions
  are automatically enabled or notifications sent to users not opted in.
- Tests: Android-installed and browser fullscreen, unsupported Apple
  fallback, safe Control push/click, role restrictions, durable server
  progress milestone and source isolation.
- CI, live Android PWA push permission, app-switch test and visual
  portrait verification must pass before deployment.
