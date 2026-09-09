# Conventions

- Always use TypeScript for all packages in the monorepo.
- Monorepo packages use `workspace:*` dependency references.
- All packages compile with `tsc -b` and the CLI is bundled with `npm run bundle` (esbuild).
- Maintain pre-commit hook verification via `zepher hook run pre-commit`.
- Use conventional commits (`feat:`, `fix:`, `chore:`, `docs:`) with semantic release numbering.
- After substantial changes, generate context with `zepher context` and handoffs with `zepher handoff`.

## [2026-09-03T03:51:07.586Z]
Always use TypeScript for new packages

