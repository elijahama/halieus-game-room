# Development Process

HGR is developed iteratively from requirements, playtesting and observed defects.

## Typical cycle

```text
idea / playtest finding
        ↓
define intended behaviour
        ↓
clarify edge cases
        ↓
AI-assisted implementation
        ↓
static / type / build checks
        ↓
regression testing
        ↓
candidate package
        ↓
production candidate build
        ↓
live browser/device validation
        ↓
accept, reject or revise
```

## Acceptance principle

A change is not considered correct simply because it compiles.

Live testing is important for:

- refresh/reconnect behavior;
- timers;
- room recovery;
- multiplayer synchronization;
- mobile and tablet layout;
- spectator state;
- trading and debt flows;
- deployment activation.

## Commit discipline

Git commits should describe meaningful changes, for example:

- Fix reconnect-safe Mega Board timer
- Add shared setup-screen game icons
- Add debt-resolution property actions
- Document AI-assisted development workflow

Avoid vague messages such as “update” or “fix stuff”.
