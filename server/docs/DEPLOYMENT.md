# Deployment

## Local production server

Build the client and server, then start production mode on port 3000.

```powershell
npm run typecheck
npm run build
npm run start:production
```

Local address: `http://localhost:3000`

## Free public access with Tailscale Funnel

The current public endpoint is:

`https://play-halieus.tailab13d9.ts.net`

The Funnel proxies HTTPS traffic to `http://127.0.0.1:3000`. The project itself does not need public-port forwarding.

The project includes a small Tailscale helper, so the normal command is:

```powershell
npm run funnel
```

You can check it later with:

```powershell
npm run funnel:status
```

To remove the Funnel configuration:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\tailscale-funnel.ps1" -Action reset
```

The host laptop, Tailscale service and Mega Monopoly production server must remain online for remote players to connect.
