# Halieus Game Room 3.5.23

## Windows public-health verification repair

- Keeps the 3.5.22 Mega Board desktop composition fix unchanged.
- Fixes a Windows PowerShell 5.1 false-negative after a successful Oracle activation: browser HTTPS could work while `Invoke-RestMethod` reported `/health` unreachable because of legacy TLS negotiation.
- Public version checks now prefer the native Windows `curl.exe` client and use an explicit TLS 1.2 `Invoke-RestMethod` fallback.
- The Oracle upload/build/install path is otherwise unchanged.
