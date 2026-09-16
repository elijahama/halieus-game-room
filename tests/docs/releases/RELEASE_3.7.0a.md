# Halieus Game Room 3.7.0a

## Oracle SSH key permission self-repair

3.7.0a is a deployment hotfix for Windows OpenSSH private-key ACL failures discovered while publishing 3.7.0.

The website updater now captures the SSH diagnostic output. When Windows OpenSSH reports an unprotected private key / overly broad local file permissions, Halieus tightens inherited and unrelated read permissions on the selected key and retries Oracle authentication automatically.

The updater still stores only the key path in `%LOCALAPPDATA%\Halieus Game Room\owner-update.json`. The private key itself is never copied into the Halieus release.

If Windows refuses the ACL change, the updater gives a specific instruction to run the updater once as Administrator rather than incorrectly reporting that Oracle rejected the key.
