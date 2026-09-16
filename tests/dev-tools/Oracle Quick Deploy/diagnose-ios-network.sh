#!/usr/bin/env bash
set -u
HOST="${1:-halieus.remotewire.net}"
echo "Halieus iOS/Wi-Fi network diagnostic"
echo "Host: $HOST"
echo
echo "== DNS =="
getent ahosts "$HOST" || true
echo
echo "== HTTPS IPv4 =="
curl -4 -fsS --connect-timeout 8 --max-time 15 -o /dev/null -w 'HTTP %{http_code} · %{remote_ip}\n' "https://$HOST/health" || echo "IPv4 HTTPS FAILED"
echo
echo "== HTTPS IPv6 =="
if curl -6 -fsS --connect-timeout 8 --max-time 15 -o /dev/null -w 'HTTP %{http_code} · %{remote_ip}\n' "https://$HOST/health"; then
  :
else
  echo "IPv6 HTTPS unavailable/failed. If public DNS publishes an AAAA record, fix or remove that record before calling the iPad Wi-Fi issue resolved."
fi
echo
echo "== Local application =="
curl -fsS --connect-timeout 3 --max-time 8 http://127.0.0.1:3000/health || echo "Local HGR health check FAILED"
echo
echo "== Nginx listeners =="
ss -ltnp 2>/dev/null | grep -E ':(80|443|3000)\\b' || true
echo
echo "Diagnostic complete. Compare this output while an affected iPad fails on Wi-Fi versus a hotspot."
