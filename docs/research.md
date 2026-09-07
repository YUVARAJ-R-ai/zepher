# Project Research: Zepher Future Necessities & Needs
_Generated: 2026-09-07_

## Problem & Goal
AI coding agents are rapidly evolving from simple chat interfaces into autonomous multi-agent systems (Claude Code, Cursor, Windsurf, Copilot, Antigravity). However, agents still suffer from context amnesia, token waste from monolithic instruction files, and drift across distributed development teams. Zepher must evolve from a basic rule/context sync tool into a full-fledged **Stateful Agent OS** featuring granular glob-scoped rule compilers, episodic-to-semantic memory consolidation, dynamic MCP v2 interfaces, real-time sync daemons, and CI drift enforcement.

## Target Users
- **Solo Developers & Power Users:** Using multiple AI tools (Cursor + Claude Code + Copilot) who want their personal engineering standards and project context synchronized without duplicating configs.
- **Engineering Teams & Tech Leads:** Enforcing company-wide architecture constraints, security rules, and lint/test verification hooks across all team members' AI agents.
- **Open Source Maintainers:** Guaranteeing external contributors and AI agents abide by repository PR standards before commits are created.

## Competitive Landscape
| Product | Strengths | Weaknesses | Key Takeaway |
|---------|-----------|------------|--------------|
| **Cursor Rules (`.cursor/rules/*.mdc`)** | Native glob matching, intelligent rule triggering, clean UI. | Locked into Cursor; does not sync to Claude Code, Windsurf, or terminal agents. | Adopt the `.mdc` frontmatter standard (`globs`, `alwaysApply`) into Zepher's core rule schema. |
| **Mem0 / agentmemory** | Vector RAG, automatic fact extraction, user preference graphs. | Heavy cloud/SaaS dependency or complex local database setup; lacks agent config compiler. | Provide local, lightweight episodic-to-semantic memory consolidation without external SaaS locks. |
| **knowhub / agent_sync** | Multi-repo config synchronization. | Passive text sync; lacks runtime MCP protocol, verification hooks, and memory layers. | Zepher's unified architecture (Rules + Skills + Hooks + Memory + MCP) is the superior complete solution. |
| **Everything Claude Code (ECC)** | Rich portable workflows, prompt checklists, battle-tested skills. | Exclusively targeted at Claude Code; manual setup across other IDEs. | Zepher should import ECC skills and adapt them universally to all IDEs. |

## Feature List

### Core (MVP — Next Horizon)
- [ ] **Glob-Scoped Rule Compiling (`.mdc` support):** Allow rules in `.zepher/rules/` to specify `globs: ["src/**/*.ts"]` and compile directly into `.cursor/rules/*.mdc` and path-filtered instructions for other agents.
- [ ] **MCP v2 Dynamic Tool Expansion:** Expose `zepher_get_rules`, `zepher_add_rule`, `zepher_list_skills`, and `zepher_sync` over MCP so agents can self-govern context.
- [ ] **Real-time Background Sync Daemon (`zepher watch`):** File-watcher that listens to `.zepher/` and `~/.zepher/` and recompiles vendor configs instantaneously on save.
- [ ] **CI Drift Detection (`zepher verify`):** Command that verifies if committed `.cursorrules` / `CLAUDE.md` match Zepher checksums, failing PRs if out-of-sync.

### Important (v1.1)
- [ ] **Memory Consolidation & Decay Engine:** Distill repetitive episodic memory entries into authoritative semantic facts, prune outdated decisions, and score memories by recency and relevance.
- [ ] **Remote Skill Registry & Git Repositories:** Support `zepher skill install user/repo@v1.0` directly from GitHub releases with semver lockfile validation.
- [ ] **Conflict Resolution Interactive TUI (`zepher resolve`):** Detect and resolve collisions between global user rules and local team constraints with visual side-by-side diffs.

### Nice-to-have (Backlog)
- [ ] **Local Hybrid Vector RAG:** In-process sqlite-vec / BM25 search for `.zepher/memory/` once memories exceed 100+ items.
- [ ] **Token Budget Profiler:** CLI command (`zepher profile`) that calculates the exact prompt token cost of active rules across models (Claude 3.7, GPT-4o, Gemini 2.0).

### Don't Build
- **Cloud-hosted SaaS Sync:** Don't build a centralized cloud database for storing private codebase rules. Keep everything Git-native and local-first for absolute security and privacy.
- **Custom IDE Extensions:** Don't build separate VSCode/Cursor marketplace extensions. Compiling directly to native filesystem files (`.cursorrules`, `CLAUDE.md`) is cleaner, faster, and zero-maintenance.

## Task Breakdown

### Glob-Scoped Rules & Modern Cursor `.mdc` Support
- [ ] Add `globs?: string[]` and `alwaysApply?: boolean` to `Rule` interface in `@zepher/core` (S)
- [ ] Update `CursorAdapter` to compile individual `.cursor/rules/<id>.mdc` files when globs are specified (M)
- [ ] Update Claude and Windsurf adapters to group rules conditionally by file path (M)

### MCP Server v2 Upgrade
- [ ] Implement `zepher_get_rules` and `zepher_add_rule` tools in `@zepher/mcp` (S)
- [ ] Implement `zepher_list_skills` and `zepher_sync` tools in `@zepher/mcp` (S)
- [ ] Add integration test validating MCP tools trigger sync compiler (M) ← depends on: `zepher_sync`

### Background Sync Watcher (`zepher watch`)
- [ ] Integrate lightweight filesystem watcher (`chokidar` or native `fs.watch`) in `@zepher/adapters` (S)
- [ ] Implement debounced compilation runner with colored terminal notifications (S)
- [ ] Add `zepher watch` command to `apps/cli` (S)

### CI Drift Detection (`zepher verify`)
- [ ] Implement checksum validation engine comparing disk files against theoretical compile output in `@zepher/core` (S)
- [ ] Add `zepher verify` CLI command with strict exit codes (0 = clean, 1 = drift detected) (S)
- [ ] Provide ready-to-use GitHub Actions workflow template in docs (S)

### Memory Consolidation & Decay
- [ ] Implement deduplication and fact-extraction heuristics in `@zepher/memory` (M)
- [ ] Implement time-decay score calculation (`score = relevance * e^(-decay_rate * days_old)`) (M)
- [ ] Add `zepher memory consolidate` CLI command (S)

## Tech Recommendations
| Layer | Recommendation | Reason |
|-------|---------------|--------|
| **Rule Format** | Extended Markdown with YAML Frontmatter (`.md` / `.mdc`) | Human-readable, native git-diffable, 100% compatible with Cursor, Claude, and Obsidian. |
| **Watcher Engine** | `chokidar` | Cross-platform (Linux/NixOS, macOS, Windows) reliable file event handling without CPU spikes. |
| **Memory Storage** | Local Git-tracked Markdown + SQLite optional cache | Zero external infrastructure, private, offline-first, audit-trailed in Git history. |
| **CLI Framework** | Commander.js + Chalk + Inquirer | Lightweight, fast startup time (<50ms), beautiful interactive prompts. |

## Risks & Open Decisions
### Risks
- **Context Window Token Inflation:** If users define too many rules, agents spend tokens unnecessarily. _Mitigation:_ Enforce glob-based rule scoping so rules only load for targeted files.
- **Merge Conflicts in Team Workspaces:** If multiple developers run `zepher rule add` simultaneously. _Mitigation:_ Store rules as individual atomic files (`rules/<id>.md`) rather than one monolithic file.

### Open Decisions
- [ ] Should `zepher watch` run as a persistent foreground CLI command or offer a background daemon option (`--daemon`)?
- [ ] How should semantic memory consolidation handle conflicting decisions (e.g. ADR-001 vs ADR-005)?

## GitHub References
- [anthropics/claude-code](https://github.com/anthropics/claude-code) — CLI architecture, tool calls, and memory management conventions.
- [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) — Standard reference implementations for Stdio MCP servers.
- [agent_sync](https://github.com/yelmuratoff/agent_sync) — Prior art for syncing rules to Cursor and Claude.
