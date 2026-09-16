# Halieus Game Room v0.22.9-rc.3.3.26

Halieus Game Room is the application. Mega Board and Poker are game modules inside it; Blackjack and WHOT are scaffolded as Coming Soon modules so future development no longer lives inside a Mega Board application folder.

## Windows launch

Use **Start Halieus Game Room** to start the private host and **Close Halieus Game Room** to stop it. The launch shortcuts and extracted application folder use the gold Halieus H icon. Mega Board and Poker keep their own game identities inside the Game Room.

The first launch on Windows may rebuild the client bundle for the current release. This is expected for source ZIP releases that are packaged from a non-Windows development environment.

## Repository layout

```text
Halieus Game Room/
├── Start Halieus Game Room.cmd
├── Close Halieus Game Room.cmd
├── client/
│   └── src/
│       ├── platform/              # Halieus shell/shared client UI/network
│       └── games/
│           ├── mega-board/        # Mega Board client UI/types/hooks/reporting
│           ├── poker/             # Poker client UI/types
│           ├── blackjack/         # Coming Soon scaffold
│           └── whot/              # Coming Soon scaffold
├── server/
│   └── src/
│       ├── index.ts               # Halieus server bootstrap
│       └── games/
│           ├── mega-board/        # Mega Board authoritative engine/AI/handlers/state
│           ├── poker/             # Poker authoritative engine/handlers/types
│           ├── blackjack/         # Coming Soon scaffold
│           └── whot/              # Coming Soon scaffold
├── shared/
│   ├── platform/                  # Future cross-game contracts
│   └── games/
│       ├── mega-board/            # Existing shared Mega Board rules/state/contracts
│       ├── poker/                 # Reserved shared Poker contracts
│       ├── blackjack/
│       └── whot/
├── tests/
├── docs/
└── assets/
```

See `ARCHITECTURE.md` for the module-boundary rules.

## Development

```powershell
npm run typecheck
npm run test:regression
npm run build
```

`npm run build` compiles both client and server. If the extracted dependency set does not include the native Rollup package for the current OS, use the target Windows launcher so npm can rebuild the client with the correct platform-native dependency.

## Product boundary

Halieus Game Room remains friends/private-room focused. Poker uses virtual chips only. There is no store, paid chip economy, or real-money wagering flow.
