# Halieus Game Room 4.1.0

## Guilds & Persistent Groups

4.1.0 adds the first persistent social-group layer to HGR.

### New

- Create private guilds.
- Join guilds with private invite codes.
- Persistent guild membership across game sessions.
- Owner, Admin, Moderator and Member roles.
- Server-validated room-creation permissions.
- One persistent guild chat.
- Guild-organised rooms for all active HGR games.
- Join/Spectate links when those rooms become live.
- Guild room history.
- Internal guild leaderboard for guild-organised completed sessions.
- Guild management inside the existing Players/social area.
- Responsive desktop/tablet/phone Guild interface.

### Architecture

Guilds do not replace existing game rooms.

A guild reserves a normal HGR room code and then opens the existing game setup. The selected game module remains server-authoritative for gameplay.

Completed normal HGR sessions are projected into guild history only after the canonical session archive is written.

### Privacy

4.1.0 is private/invite-led.

There is no public guild directory or search endpoint.

### Deliberate first-version limits

- One persistent chat per guild; channels can come later.
- Guild-owner transfer is not implemented yet.
- Guild leaderboard statistics are separate from Ranked ratings.
- Custom guild images/banners are not included yet.

## Validation

Before release packaging:

```bash
npm run typecheck
npm run build
npm run test:regression
npm run prepare:release
```

The final `RELEASE.json` fingerprint is generated from the validated local source and must not be hand-edited.
