# Halieus Game Room 3.7.0a validation

- Regression chain 3.6.8 through 3.7.0a: PASS
- Launcher separation regression: PASS
- Release-integrity manifest: PASS
- New updater regression verifies SSH diagnostic capture, permission-error detection, ACL repair path, retry, and key-path-only handling.
- Full dependency-backed TypeScript build was not run in the packaging sandbox because `node_modules` is not present; Oracle candidate deployment remains the build/typecheck hard gate.
- Windows ACL repair must be confirmed by the next real updater run on Windows.
