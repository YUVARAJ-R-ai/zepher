# Current Context for zepher

## Project Overview
# Project Facts

Name: zepher-cli
Language: TypeScript (ESM)
Runtime: Node.js (>= 18.0.0)
Architecture: Modular Monorepo (pnpm workspaces)
Bundler: esbuild (standalone CLI distribution)
Testing: Vitest (15 test suites, 93 tests)
Package Distribution: npm (zepher-cli@0.3.1)
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
(No active tasks. Create one with `zepher task create <name>`)

## Recent Architecture Decisions
- **ADR-0002: Bundle CLI with esbuild for standalone npm distribution** (Accepted)
- **ADR-0001: Use Nextjs App Router** (Proposed)

## Recent Work & Handoffs
**Latest session handoff (2026-11-04T13-46):**

# Agent Handoff - 2026-11-04T13-46

## Objective
Task 6: end-to-end test, verify #1, fix what breaks

## Completed
Ran every CLI command and all 17 MCP tools over stdio from the packed tarball; fixed 5 bugs

## Current State
- **Branch**: `YUVARAJ-R-ai/feat-complete-board-tasks`
- **Recent Commits**:
- `3051a0f (HEAD -> refs/heads/YUVARAJ-R-ai/feat-complete-board-tasks) fix: validate required MCP tool arguments and reject unknown tools`
- `bd0e316 fix: exit non-zero when asset track or stash fails`
- `45dfcf7 fix: exit non-zero when vault track, seal or unseal fails`

## Repository State
- Branch: `YUVARAJ-R-ai/feat-complete-board-tasks`
- Uncommitted files: 5 modified/untracked file(s)

## Next Steps
Consult active backlog or check project goals.
