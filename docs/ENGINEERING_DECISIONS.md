# Selected Engineering Decisions

## One application, modular games

Halieus Game Room is the application root. Games are modules inside the platform, not separate standalone products.

## Server authority

Clients request actions. The server validates and applies legal actions to authoritative state.

## Reconnect-safe timers

Timers are represented by absolute server deadlines. Refreshing or reconnecting must not create a fresh turn window.

## Shared platform systems

Accounts, rooms, invitations, spectators, reconnect, common navigation, results and responsive shell behavior should be shared where practical.

## Public repository safety

The same HGR project folder is used for development, Git and deployment. Different inclusion rules control what goes to GitHub and what goes to production.

This avoids parallel copies drifting out of sync.
