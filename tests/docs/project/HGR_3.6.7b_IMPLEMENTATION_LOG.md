# HGR 3.6.7b Implementation Log

Oracle updater hotfix prompted by a Windows extraction where `Halieus Game Room.ico` was absent even though the release archive contained it. The website updater had incorrectly classified that desktop launcher asset as mandatory production source. 3.6.7b separates the concern: the file remains in normal packages, but Oracle packaging/fingerprint verification no longer depends on it.
