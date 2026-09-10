# Current Context for zepher

## Project Overview
# Project Facts

Name: zepher-cli
Language: TypeScript (ESM)
Runtime: Node.js (>= 18.0.0)
Architecture: Modular Monorepo (pnpm workspaces)
Bundler: esbuild (standalone CLI distribution)
Testing: Vitest (11 test suites, 39 tests)
Package Distribution: npm (zepher-cli@0.3.0)
Supported Agent Targets: Cursor (.cursorrules, .cursor/rules/*.mdc, .cursor/mcp.json), Claude Code (CLAUDE.md, .claude.json), Gemini/Antigravity (.gemini/rules/), Windsurf (.windsurfrules), GitHub Copilot (.github/copilot-instructions.md)

## Architecture Notes
# Architecture

- Core Engine: `@zepher/core` handles state resolution, two-tier inheritance, checksum safety, Team Vault & Asset Hub, and hooks runner.
- Compiler & Adapters: `@zepher/adapters` compiles unified state to vendor configurations, provides file watching, and drift verification.
- Packages: `@zepher/memory`, `@zepher/tasks`, `@zepher/decisions`, `@zepher/sessions`, `@zepher/skills`, `@zepher/context`, `@zepher/integrations`, `@zepher/mcp`.
- CLI Entrypoint: `apps/cli` bundled via esbuild to `apps/cli/dist/index.js` with external dependencies (`commander`, `chalk`, `yaml`, `@inquirer/prompts`, `@modelcontextprotocol/sdk`).

## [2026-09-08T16:35:08.054Z]
Skills support YAML frontmatter versioning, lockfile tracking, zepher skill update for upstream synchronization, and zepher skill pin/unpin for project-level version freezing

## Constraints
# Constraints

## Conventions
# Conventions

- Always use TypeScript for all packages in the monorepo.
- Monorepo packages use `workspace:*` dependency references.
- All packages compile with `tsc -b` and the CLI is bundled with `npm run bundle` (esbuild).
- Maintain pre-commit hook verification via `zepher hook run pre-commit`.
- Use conventional commits (`feat:`, `fix:`, `chore:`, `docs:`) with semantic release numbering.
- After substantial changes, generate context with `zepher context` and handoffs with `zepher handoff`.

## [2026-09-03T03:51:07.586Z]
Always use TypeScript for new packages

## Active Tasks
- **[automated-pr-drift-verificatio]** Automated PR Drift Verification

## Recent Architecture Decisions
- **ADR-0002: Bundle CLI with esbuild for standalone npm distribution** (Accepted)
- **ADR-0001: Use Nextjs App Router** (Proposed)

## Recent Work & Handoffs
**Latest session handoff (2026-09-10T15-17):**

# Agent Handoff - 2026-09-10T15-17

## Objective
Publish zepher-cli 0.3.1 with builtin zepher-data-vault skill

## Completed
Created builtin zepher-data-vault skill, updated bootstrap logic, added -s/--storage option to asset track, bumped version to 0.3.1, pushed to GitHub main, and published zepher-cli@0.3.1 to npm registry.

## Current State
- **Branch**: `main`
- **Recent Commits**:
- `4caef98 (HEAD -> refs/heads/main, refs/remotes/origin/main, refs/remotes/origin/HEAD) chore(release): bump version to 0.3.1 with builtin zepher-data-vault skill`
- `6bd1522 feat(skills): add builtin zepher-data-vault skill for team secrets and blob storage distribution`
- `8d5d2d4 docs: document standalone CLI commands and agent MCP directives in README`

## Repository State
- Branch: `main`
- Uncommitted files: 1 modified/untracked file(s)

## Next Steps
Focus on the highest priority active task listed above.
