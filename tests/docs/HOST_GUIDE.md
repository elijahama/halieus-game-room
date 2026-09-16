# Host Guide

## Creating the room

The host chooses Casual or Ranked mode and can configure the Casual Free Parking jackpot before creating the room.

After room creation the lobby provides a direct invite link and QR code. Local-network testing can use the computer's Wi-Fi address; remote play uses the Tailscale Funnel address `https://play-halieus.tailab13d9.ts.net`.

## Adding AI players

The host can add Easy, Normal or Hard AI seats in Casual rooms. AI players use the same authoritative server rules as human seats.

## Starting

At least two active seats are required. The match first resolves starting-player order, including rerolls for ties, before normal gameplay begins.

## Session control

The Game Menu provides:

- Resume game
- Send beta feedback
- Copy recovery key
- End game for everyone

Ending the room intentionally removes its persistent room save. A browser refresh does not.

## Beta feedback

Tester feedback is appended to `server/data/feedback.ndjson`. The report contains the room code, player name, browser/device user agent, page URL, build version and timestamp alongside the submitted description.
