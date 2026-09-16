# Halieus Game Room 3.5.6

## Hosted first-paint / access continuity

The hosted white "Checking player access" flash was traced to a normal `/auth/status` request becoming visible once internet/Nginx latency crossed the 3.5.5 320 ms display threshold. Localhost usually completed the request before that threshold, which is why the issue appeared after moving production to Oracle.

3.5.6 removes the delayed technical access bridge entirely. A small theme-aware Halieus first-paint curtain now ships directly in `client/index.html`, before React and before the bundled stylesheet. It remains above the application until the intro, guest route, authenticated/signed-out state, or a genuine connection error is ready. Normal players therefore never see account-check implementation copy during refresh.

The full Halieus intro remains separate and still runs once per browsing session. Genuine account-service failures retain an intentional Halieus error surface with a retry action.
