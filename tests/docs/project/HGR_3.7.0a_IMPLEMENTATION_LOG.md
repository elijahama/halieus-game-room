# HGR 3.7.0a implementation log

Observed production update blocker: the saved Oracle private key was valid, but Windows OpenSSH refused to use it because inherited ACL entries allowed another local group to read the file.

Implemented:
- capture native SSH diagnostic output;
- distinguish local key-permission failure from genuine Oracle public-key rejection;
- automatically remove inherited/unrelated ACL entries for the private key;
- retain read permission for the current Windows identity;
- retry Oracle authentication immediately;
- preserve the rule that no private key is copied into release artifacts.

This is intentionally isolated to the updater and does not change gameplay or protected game layouts.
