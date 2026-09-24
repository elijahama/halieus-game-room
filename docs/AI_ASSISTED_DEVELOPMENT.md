# AI-Assisted Development

Halieus Game Room is a **human-directed, AI-assisted engineering project**.

## Human direction

The project owner directs:

- product direction;
- gameplay rules;
- user experience requirements;
- architectural requirements;
- testing criteria;
- acceptance and rejection decisions;
- deployment decisions;
- project documentation goals.

## AI assistance

AI tools assist with:

- TypeScript, React and Node implementation;
- debugging;
- refactoring;
- test generation;
- technical analysis;
- documentation;
- release preparation.

The project should not be described as fully hand-coded by the owner, nor as a one-prompt autonomous AI project.

A concise description is:

> Halieus Game Room is a human-directed, AI-assisted multiplayer software project. I define the product, rules, system requirements, testing and acceptance decisions, while AI tools are used extensively during implementation, debugging and documentation.


## AI work receipts with Openshard

HGR uses [Openshard](https://github.com/openshard/openshard) as optional local development provenance tooling.

Openshard does not write HGR gameplay code and is not part of the player-facing application. It sits around supported coding-agent sessions and records the evidence available from those runs: the agent, task excerpt, observed/reported file changes, checks, capture completeness and receipt integrity.

That makes it useful for HGR's development model because the repository can be explicit about two different things:

- **project ownership and acceptance remain human-directed**;
- **AI implementation work can leave a technical receipt instead of being described vaguely or retrospectively**.

Receipts are local-first under `.openshard/`, which is ignored by HGR source control. Hosted Openshard sync is not required for the HGR workflow and should only be enabled deliberately.

For the project-specific setup and commands, see [OPENSHARD.md](OPENSHARD.md).

For the architectural role of receipts, evidence boundaries and how provenance differs from validation, see [project/HGR_AI_PROVENANCE_ARCHITECTURE.md](project/HGR_AI_PROVENANCE_ARCHITECTURE.md).

### Attribution

Openshard is a separate open-source project by Michael Obasa / the Openshard project and is licensed under Apache-2.0. HGR uses it as external developer tooling rather than vendoring its source into the game.
