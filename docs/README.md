# Halieus Game Room documentation

This folder contains both **current project documentation** and **historical implementation records**.

For the current project story, start with the root [README](../README.md).

## Current documentation

### Product and platform
- [HGR Masterbook](HGR_MASTERBOOK.md) — living project summary and engineering map
- [Project overview](PROJECT_OVERVIEW.md)
- [Game catalogue](GAME_CATALOGUE.md)
- [Game visual identity system](GAME_VISUAL_IDENTITY_SYSTEM.md)
- [Brand asset pipeline](BRAND_ASSET_PIPELINE.md)
- [Cosmetic theme system](COSMETIC_THEME_SYSTEM.md)
- [Feature matrix](FEATURE_MATRIX.md)
- [Gameplay rules](GAMEPLAY_RULES.md)
- [Player guide](USER_GUIDE.md)
- [Host guide](HOST_GUIDE.md)
- [Beta tester guide](BETA_TESTER_GUIDE.md)
- [Known limitations](KNOWN_LIMITATIONS.md)

### Architecture and engineering
- [Current architecture](../ARCHITECTURE.md)
- [Architecture overview](ARCHITECTURE.md)
- [Data model](DATA_MODEL.md)
- [Socket events](SOCKET_EVENTS.md)
- [Engineering decisions](ENGINEERING_DECISIONS.md)
- [Development process](DEVELOPMENT_PROCESS.md)
- [AI-assisted development](AI_ASSISTED_DEVELOPMENT.md)
- [Openshard development receipts](OPENSHARD.md)
- [AI provenance architecture](project/HGR_AI_PROVENANCE_ARCHITECTURE.md)
- [GitHub workflow](GITHUB_WORKFLOW.md)
- [HGR Mobile Control](HGR_MOBILE_CONTROL.md) — phone control architecture, security model and guided build

### Quality and release
- [Testing](TESTING.md)
- [Deployment](DEPLOYMENT.md)
- [Deployment overview](DEPLOYMENT_OVERVIEW.md)
- [4.0.0 deployment correction](DEPLOYMENT_FIX_4.0.0.md)
- [4.0.0 audit](AUDIT_4.0.0.md)
- [4.0.0 validation](VALIDATION_4.0.0.md)
- [4.0.1 implementation log](project/HGR_4.0.1_IMPLEMENTATION_LOG.md)
- [4.0.1 release notes](releases/RELEASE_4.0.1.md)
- [4.0.2 implementation log](project/HGR_4.0.2_IMPLEMENTATION_LOG.md)
- [4.0.2 release notes](releases/RELEASE_4.0.2.md)
- [4.1.0 implementation log](project/HGR_4.1.0_IMPLEMENTATION_LOG.md)
- [4.1.0 release notes](releases/RELEASE_4.1.0.md)
- [4.1.1 implementation log](project/HGR_4.1.1_IMPLEMENTATION_LOG.md)
- [4.1.1 release notes](releases/RELEASE_4.1.1.md)
- [4.5.2 release notes](releases/RELEASE_4.5.2.md)
- [Publication checklist](PUBLICATION_CHECKLIST.md)

## Historical development records

The repository also retains older RC and patch notes because they document how HGR evolved.

Examples include:

- `RC_3_3_*_IMPLEMENTATION.md`
- `PATCH 3.5.* - READ ME.txt`
- [Development timeline](DEVELOPMENT_TIMELINE.md)

These files are **historical records**, not the current source of truth for 4.5.x behaviour or validation.

## Documentation principle

The repository should read in this order:

```text
README
  ↓
product / platform overview
  ↓
architecture and shared systems
  ↓
game-specific behaviour
  ↓
testing and deployment
  ↓
development process / AI disclosure
  ↓
historical implementation records
```

Google Drive remains the deeper internal project knowledge base and decision history. GitHub contains the source-controlled documentation appropriate for engineering and portfolio readers.
