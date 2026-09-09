# Architecture

- Core Engine: `@zepher/core` handles state resolution, two-tier inheritance, checksum safety, Team Vault & Asset Hub, and hooks runner.
- Compiler & Adapters: `@zepher/adapters` compiles unified state to vendor configurations, provides file watching, and drift verification.
- Packages: `@zepher/memory`, `@zepher/tasks`, `@zepher/decisions`, `@zepher/sessions`, `@zepher/skills`, `@zepher/context`, `@zepher/integrations`, `@zepher/mcp`.
- CLI Entrypoint: `apps/cli` bundled via esbuild to `apps/cli/dist/index.js` with external dependencies (`commander`, `chalk`, `yaml`, `@inquirer/prompts`, `@modelcontextprotocol/sdk`).

## [2026-09-08T16:35:08.054Z]
Skills support YAML frontmatter versioning, lockfile tracking, zepher skill update for upstream synchronization, and zepher skill pin/unpin for project-level version freezing
