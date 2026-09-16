# Halieus Game Room 3.6.0 release contract

## Purpose

3.6.0 closes the unstable 3.5.x UI iteration and establishes a protected, page-scoped desktop baseline. It prioritizes layout integrity and release truth over adding unfinished game tiles.

## Included

### Game Room shell
- Fixed desktop sidebar.
- Profile card directly below HGR branding.
- Home / Games / Players / Join Game navigation hierarchy.
- Full Screen beside persistent System / Light / Dark theme selection.
- Main content is the only desktop shell scroll surface.

### Home/social
- Existing hero retained.
- Continue-playing and quick-play discovery.
- Friends/live rooms with native Join/Spectate actions.
- Native account-to-account game invitations for a room the sender is currently playing in.
- Recipient invite inbox on Home with Join/Spectate/Dismiss.

### Games and Players
- Category-isolated responsive game grid; no cross-category collisions.
- Player search/status filters.
- Live-game status and Join/Spectate actions.
- Overall stats, favourite game, current win streak, per-game record and recent matches.
- Invite selected registered player into the sender's active room.

### Games requiring layout repair
- Mega Board: authoritative viewport square fit, internal player-rail scroll, Autopilot isolation.
- Blackjack: viewport containment and embedded Live Room slot.
- Connect Four: compact identifiable player markers + dedicated Live Room stack; board logic/layout source otherwise preserved.
- WHOT: bounded table + room/activity column.
- Poker: Live Room sizing only; gameplay/table source protected.
- Ludo: completely protected.

### Owner/Profile
- Owner sections: Overview / Players / Invites / Rooms / Audit / Test Lab / Account.
- Compact account/profile forms and statistics.
- Invitation filters and non-nested history flow.

## Explicitly not included

The following requested games are not claimed as playable in 3.6.0: Villagers & Mafia, Wordle-style, Catan-style, Dobble-style, Cheat, Dominoes, Password, and Anagrams Race. They require isolated gameplay engines and will be implemented after the stabilized 3.6 platform baseline.

## Deployment

3.6.0 preserves the 3.5.27 release-integrity deployment model. Start and Restart cannot deploy. Routine Update cannot provision Oracle. The exact 3.5.27 release is retained in the Oracle Quick Deploy Backups directory.

## Deployment packaging correction (same 3.6.0 release)

The 3.6.0 Windows packer now includes the complete release-integrity inventory in the Oracle source archive, including the 3.6 regression gate, release documentation and root release documents. The packer also opens the generated source ZIP locally and refuses to upload it unless every integrity input and required TypeScript build configuration is present. This is a correction to 3.6.0 itself, not a new version suffix.
