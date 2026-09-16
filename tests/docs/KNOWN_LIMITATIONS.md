# Known Limitations

This document tracks non-blocking limitations during the release-candidate phase.

- Public hosting currently depends on the host laptop, the Mega Monopoly server and Tailscale Funnel remaining online.
- The free public address is the Tailscale Funnel hostname `https://play-halieus.tailab13d9.ts.net`.
- The local JSON room store is suitable for the current single-server beta but should be placed on persistent storage for hosted deployment.
- Human Autopilot and AI are deterministic/rule-based strategies rather than machine-learning agents.
- Spectator mode is intended for trusted beta use. Active-player UI masks opponent cash, while the authoritative server state still contains full cash data for rule calculation.
- Final visual tuning is still being tested across different tablet/browser viewport sizes.
- Audio and animation pacing remain subject to beta feedback and reduced-motion preferences.
