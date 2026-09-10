<div align="center">

# ⚡ ZEPHER

### **The Universal Agent Environment Manager, Persistent Memory Layer & Team Vault**

*Context windows are temporary. Project knowledge and standards are persistent.*

[![npm version](https://img.shields.io/npm/v/zepher-cli?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/zepher-cli)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-v2%20Compatible-green.svg?style=for-the-badge)](https://modelcontextprotocol.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](https://github.com/YUVARAJ-R-ai/zepher/pulls)

<p align="center">
  <a href="#-why-zepher">Why Zepher?</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-quickstart">Quickstart</a> •
  <a href="#-core-capabilities">Capabilities</a> •
  <a href="#-team-vault--asset-hub">Team Vault & Assets</a> •
  <a href="#-multi-agent-skills-hub">Skills Hub</a> •
  <a href="#-zepher-standalone-commands-cli-reference">Standalone Commands</a> •
  <a href="#-zepher-agent-commands--integration-reference">Agent Commands</a>
</p>

---

</div>

## 💡 Why Zepher?

Modern AI coding agents (**Claude Code**, **Cursor**, **Windsurf**, **GitHub Copilot**, **Gemini / Antigravity**) have created operational fragmentation across teams:

- ❌ **Configuration Hell:** You are forced to duplicate rules across `.cursorrules`, `CLAUDE.md`, `.windsurfrules`, `.gemini/rules/`, and `.github/copilot-instructions.md`.
- ❌ **Agent Amnesia & Fragmentation:** When context truncates, agents forget architectural decisions (ADRs) and stack constraints. Worse, skills discovered in Antigravity aren't accessible to Claude Code or Cursor.
- ❌ **Secret Leaks & Onboarding Friction:** `.env` configs and database seeds either leak into AI prompts or take days for new teammates to configure manually.
- ❌ **Silent Configuration Drift:** Developers edit agent prompts by hand, leaving team repos out of sync and breaking CI/CD pipelines.

### **The Zepher Solution**

**Zepher acts as the single source of truth for your entire AI agent ecosystem.** Define rules, skills, lifecycle hooks, and encrypted team secrets once (globally or per-project). Zepher deterministically compiles and synchronizes them into vendor-native files with cryptographic watermarks, provides real-time file watching, verifies CI drift, unifies cross-agent skills via live symlinking, and exposes memory via native Stdio MCP v2.

---

## 🏗️ Architecture

```
                       ┌──────────────────────────────────────────────┐
                       │       Global Scope (~/.zepher/)              │
                       │   • Engineering standards & rules            │
                       │   • Universal skills hub (harvested)         │
                       │   • Cross-repo lifecycle hooks               │
                       └──────────────────────┬───────────────────────┘
                                              │
                                              ▼  Inheritance & Overrides
                       ┌──────────────────────────────────────────────┐
                       │       Local Scope (<project>/.zepher/)       │
                       │   • Project ADRs & stack rules (globs)       │
                       │   • Active tasks & session handoffs          │
                       │   • Team Vault (AES-256-GCM secrets & env)   │
                       │   • Asset Hub (Seeds, binaries & fixtures)   │
                       └──────────────────────┬───────────────────────┘
                                              │
                               [ Zepher Unified Engine v0.3.1 ]
                                 ├── Watch Daemon (auto-sync)
                                 ├── Drift Verifier (CI/CD)
                                 ├── AI Schema Masker (anti-leak)
                                 └── Skills Harvester & Symlinker
                                              │
         ┌───────────────────┬────────────────┴───────┬───────────────────┐
         ▼                   ▼                        ▼                   ▼
    ┌──────────┐       ┌───────────┐            ┌───────────┐       ┌───────────┐
    │  Cursor  │       │Claude Code│            │ Windsurf  │       │Copilot /  │
    │  Adapter │       │  Adapter  │            │  Adapter  │       │Antigravity│
    └────┬─────┘       └─────┬─────┘            └─────┬─────┘       └─────┬─────┘
         ▼                   ▼                        ▼                   ▼
    .cursorrules &     CLAUDE.md,               .windsurfrules      .github/ &
  .cursor/rules/*.mdc  .claude.json, &                              .gemini/rules/ &
                       ~/.claude/skills/                            ~/.gemini/.../skills/
```

---

## 🚀 Installation & Quickstart

### 1. Global Installation

```bash
npm install -g zepher-cli
# or run directly with npx
npx zepher-cli init
```

Verify the installation:
```bash
zepher --version
# Output: 0.3.1
```

### 2. Initialize in 5 Seconds

Initialize your current repository and bootstrap your global environment:
```bash
# In your project root:
zepher init
```
*✨ This creates `.zepher/` locally and initializes `~/.zepher/` for machine-wide configurations without touching existing code.*

### 3. Add Rules & Synchronize

```bash
# Add a scoped local rule targeting specific files
zepher rule add "Use Next.js 15 App Router with Tailwind CSS" \
  -t "Framework Standards" \
  --globs "src/app/**/*" \
  -p 90

# Add a personal global rule that applies to every project on your machine
zepher rule add "Never use 'any' in TypeScript; prefer 'unknown'" \
  -t "Strict Typing" \
  -p 95 -g

# Synchronize across all AI agents (.cursorrules, CLAUDE.md, Cursor MDCs, etc.)
zepher sync
```

---

## ⚡ Core Capabilities

### 1. 🌐 Universal Rules Engine & Scoped Globs
Manage your engineering standards in one place.
- **Priority-Driven:** Rules are sorted by priority (1–100). Critical constraints appear at the top of generated agent instructions.
- **File-Specific Scoping (Cursor `.mdc` Support):** Attach globs to rules with `--globs "src/**/*.ts"`. Zepher compiles them into modular Cursor `.mdc` rules and context instructions.
- **Two-Tier Inheritance:** Global rules from `~/.zepher/rules/` are seamlessly merged with project-local rules from `.zepher/rules/`. Local rules override global rules matching the same ID.
- **Token Efficiency:** Memory and historical logs are strictly partitioned and never dumped indiscriminately into prompt files.

### 2. 🔄 Non-Destructive Sync & Safety Watermarks
- **Safety First:** Files generated by Zepher feature an auto-generated cryptographic header:
  ```markdown
  <!-- AUTO-GENERATED BY ZEPHER — DO NOT EDIT DIRECTLY -->
  <!-- Last synced: 2026-09-08T... | Checksum: 384480f8b91a -->
  <!-- To modify, update rules in .zepher/rules/ or run `zepher rule add` -->
  ```
- **Zero Accidental Overwrites:** If an existing hand-crafted `CLAUDE.md` or `.cursorrules` does not have a Zepher watermark, `zepher sync` halts and asks you to run `zepher import` or supply `--force`.
- **Dry-Run Preview:** Run `zepher sync --dry-run` to preview file operations and JSON patches without touching the disk.

### 3. 🛡️ CI/CD Drift Verification (`zepher verify`)
Ensure committed agent configurations always match your Zepher rules:
```bash
zepher verify
```
- Exits with a non-zero status code if any configuration has drifted or was edited by hand outside of Zepher.
- Perfect for automated CI pipelines (GitHub Actions, GitLab CI) and pre-push hooks.

### 4. 👁️ Background Auto-Sync Daemon (`zepher watch`)
Never worry about running `zepher sync` manually again:
```bash
zepher watch
```
- Monitors `.zepher/` for any rule or skill file modifications, creations, or deletions.
- Debounces file-system events and automatically compiles vendor configurations in real time.

### 5. 🪝 Universal Lifecycle Hooks & Git Hook Bridge
Enforce quality across all agents without repeating yourself:
- **Stages:** `pre-sync`, `post-sync`, `pre-commit`, `post-commit`.
- **Git Hook Bridge:** Run `zepher hook install-git` to wire Zepher's verification hooks directly into `.git/hooks/pre-commit`.
- **Prompt Injection:** When hooks exist, `zepher sync` automatically injects mandatory verification checklists into `.cursorrules` and `CLAUDE.md`.

```bash
# Add a pre-commit test runner
zepher hook add test-runner -s pre-commit -r "npm test"

# Bridge into Git
zepher hook install-git
```

### 6. 📥 Reverse Ingestion (`zepher import`)
Migrating an existing codebase to Zepher?
```bash
zepher import
```
Zepher automatically scans existing `.cursorrules`, `CLAUDE.md`, `.windsurfrules`, and `copilot-instructions.md`, extracts individual rules, and preserves your setup inside `.zepher/rules/`.

### 7. 🔌 External Intelligence Integrations
Zepher coordinates with external tools through an interactive terminal TUI:
```bash
zepher integrate
```
- **codebase-memory-mcp:** Tactical LSP symbol navigation & definitions.
- **Graphify:** Structural AST & semantic knowledge graphs.
- **Everything Claude Code (ECC):** Portable engineering workflows and agent practices.

---

## 🔐 Team Vault & Asset Hub

### 1. 🔒 Zepher Team Vault (`zepher vault`)
Safely share team secrets, environment configurations, and sensitive credentials with zero-knowledge AES-256-GCM encryption.

```bash
# 1. Track a private file (automatically added to .gitignore)
zepher vault track .env.production --type secret

# 2. Seal into encrypted envelope (.zepher/vault/vault.enc)
zepher vault seal --passphrase "$TEAM_SECRET_KEY"

# 3. Teammates unseal in their working directory
zepher vault unseal --passphrase "$TEAM_SECRET_KEY"

# 4. Check status of tracked vault items
zepher vault status
```

- **Smart 3-Way `.env` Reconciliation:** Unsealing an updated team `.env` **never** overwrites a developer's local overrides (e.g. `PORT=3001` or `DEBUG=true`). Zepher performs an intelligent key-level merge.
- **AI Context Masking:** Zepher automatically detects secrets and generates safe placeholder schema masks (e.g., `DATABASE_URL="postgresql://user:***@localhost:5432/db"`) so agents know the environment shape without exposing credentials to LLM prompts.

### 2. 📦 Asset Hub (`zepher asset`)
Manage database seeds, mock payloads, binaries, and heavy test fixtures without bloating Git.

```bash
# Track a heavy seed file or test fixture
zepher asset track test/fixtures/seed.sql

# Stash into local or team asset store
zepher asset stash test/fixtures/seed.sql

# Restore with SHA-256 integrity verification
zepher asset pull test/fixtures/seed.sql
```

---

## 🧠 Multi-Agent Skills Hub

Different agents store skills in disparate directories (`~/.gemini/config/skills`, `~/.claude/skills`, `~/.cursor/skills`). Zepher unifies them into a single, synchronized skill ecosystem.

### 1. Multi-Agent Skill Harvester (`zepher skill harvest`)
Scans all installed agent folders, discovers existing skills, normalizes `SKILL.md` frontmatter, and consolidates them into Zepher:
```bash
zepher skill harvest
```
*Discovers and ingests skills across Antigravity, Claude Code, and project-local skills without data loss.*

### 2. Live Universal Symlinking (`zepher skill link`)
Wires all installed skills to every agent via filesystem symlinks:
```bash
zepher skill link
```
- **Instant Two-Way Synchronization:** Edit a skill once in `~/.zepher/skills/` (or from within Antigravity / Claude Code) and the update is immediately live for all other agents.
- **Zero Disk Waste:** Avoids cloning multiple copies of large skills. Use `--copy` if your environment requires physical duplication.

### 3. Skill Versioning & Upstream Updates (`zepher skill update`)
Keep installed skills fresh with semantic versioning and SHA-256 lockfile tracking:
```bash
# Update a specific skill from its remote GitHub or local source
zepher skill update frontend-aesthetic

# Update all installed skills at once
zepher skill update --all
```
- **Frontmatter SemVer:** Automatically extracts `version: x.y.z` from `SKILL.md` frontmatter.
- **Integrity Validation:** Compares cryptographic checksums and updates `zepher-lock.yaml`.

### 4. Pinned Project Snapshots (`zepher skill pin`)
Freeze a project's skills to prevent breaking global changes from affecting production:
```bash
# Pin a global skill to the current project repo (.zepher/skills/)
zepher skill pin react-best-practices

# Revert to inheriting the global version
zepher skill unpin react-best-practices
```

---

## 💻 Zepher Standalone Commands (CLI Reference)

All standalone developer commands are invoked via the `zepher` CLI executable. Commands operate either locally within the workspace (`.zepher/`) or across the user's workstation globally (`~/.zepher/`).

### ⚙️ Lifecycle & Environment
| Command | Options / Arguments | Description |
|---|---|---|
| `zepher init` | `[-g, --global]` | Initialize Zepher in current workspace (`.zepher/`) or globally (`~/.zepher`). |
| `zepher status` | — | Display comprehensive project status, active tasks, memory state, and tracked files. |
| `zepher doctor` | — | Run deep diagnostic health checks across environment paths, lockfiles, and integrations. |
| `zepher capabilities` | — | Print matrix of active core features, extensions, and integration hooks. |
| `zepher agent bootstrap` | — | Bootstrap complete agent environment (`AGENTS.md`, 12 project skills, 7 agent personas). |

### 🔄 Sync, Watch, Verify & Reverse-Import
| Command | Options / Arguments | Description |
|---|---|---|
| `zepher sync` | `[-d, --dry-run]`<br>`[-f, --force]`<br>`[-a, --adapter <name>]` | Compile and synchronize unified state into vendor agent files (`.cursorrules`, `CLAUDE.md`, `.windsurfrules`, `.gemini/rules/`, `.github/copilot-instructions.md`) and auto-merge MCP configurations. |
| `zepher watch` | — | Start background daemon that monitors `.zepher/` and triggers automatic re-compilation on changes. |
| `zepher verify` | — | CI/CD drift detection engine; exits with non-zero code if committed vendor files drift from Zepher state. |
| `zepher import` | `[-f, --force]` | Scan workspace and reverse-import pre-existing vendor configuration files into managed Zepher rules. |

### 🛠️ Engineering Rules Engine (`zepher rule`)
| Command | Options / Arguments | Description |
|---|---|---|
| `zepher rule add <content>` | `[-t, --title <title>]`<br>`[-p, --priority <1-100>]`<br>`[--tags <tags>]`<br>`[--globs <pattern>]`<br>`[--always-apply]`<br>`[-g, --global]` | Register an engineering standard or prompt constraint with priority weighting and path glob matching. |
| `zepher rule list` | — | List all global (`~/.zepher/rules`) and local (`.zepher/rules`) rules with IDs, priorities, and previews. |
| `zepher rule remove <id>` | `[-g, --global]` | Remove a managed rule by its unique ID from project or global scope. |

### 📦 Portable Agent Skills Hub (`zepher skill`)
| Command | Options / Arguments | Description |
|---|---|---|
| `zepher skill install <source>` | `[-n, --name <name>]`<br>`[-g, --global]` | Install a skill from a local path or remote GitHub URL with SHA-256 integrity validation and lockfile registration. |
| `zepher skill list` | — | List all installed skills across global (`~/.zepher/skills`) and project (`.zepher/skills`) scopes with versions and descriptions. |
| `zepher skill update [name]` | `[-a, --all]`<br>`[-g, --global]` | Check upstream sources and update a specific skill or all tracked skills, updating lockfile checksums. |
| `zepher skill pin <name>` | — | Snapshot and freeze a global skill into local `.zepher/skills/` to protect project stability from upstream updates. |
| `zepher skill unpin <name>` | — | Unpin a project skill to resume inheriting the global version. |
| `zepher skill remove <name>` | `[-g, --global]` | Remove an installed skill from local or global scope. |
| `zepher skill harvest` | `[-l, --local]`<br>`[--overwrite]` | Scan vendor directories (`~/.gemini`, `~/.claude`) and ingest discovered skills into Zepher with deduplication. |
| `zepher skill link` | `[--copy]` | Create symlinks (or copy files) to expose Zepher skills to Antigravity (`~/.gemini/config/skills`) and Claude Code (`~/.claude/skills`). |

### 🪝 Lifecycle Hooks Engine (`zepher hook`)
| Command | Options / Arguments | Description |
|---|---|---|
| `zepher hook add <name>` | `-s, --stage <stage>`<br>`-r, --run <cmd>`<br>`[-g, --global]` | Register an automated hook (`pre-sync`, `post-sync`, `pre-commit`, `post-commit`) to execute custom shell commands. |
| `zepher hook list` | — | Inspect all registered local and global lifecycle hooks and their execution commands. |
| `zepher hook run <stage>` | `<stage>` | Manually trigger and execute all registered hooks for a given lifecycle stage. |
| `zepher hook remove <name>` | `[-g, --global]` | Remove a registered lifecycle hook by name. |
| `zepher hook install-git` | — | Install Zepher pre-commit bridge into `.git/hooks/pre-commit` to guarantee CI and test verification before commits. |
| `zepher hook uninstall-git` | — | Remove the Zepher hook bridge from `.git/hooks/`. |

### 🧠 Memory, Context & Sessions
| Command | Options / Arguments | Description |
|---|---|---|
| `zepher remember "<text>"` | `[-t, --type <type>]`<br>`[-g, --global]` | Save persistent knowledge (`conventions`, `architecture`, `project`, `constraints`, `lessons`) with automated secret scanning. |
| `zepher recall "<query>"` | `<query>` | Fast, safe regex query across local and global memory stores with scope attribution. |
| `zepher context` | — | Generate and refresh the composite markdown context in `.zepher/context/current.md`. |
| `zepher handoff` | `[-o, --objective <text>]`<br>`[-c, --completed <text>]`<br>`[-b, --blockers <text>]`<br>`[-n, --notes <text>]`<br>`[-a, --next <text>]` | Synthesize an actionable session handoff note auto-populated with git branch, status, recent commits, and active tasks. |

### 📝 Persistent Tasks Suite (`zepher task`)
| Command | Options / Arguments | Description |
|---|---|---|
| `zepher task create <name>` | `[-o, --objective <text>]` | Create a new active task in `.zepher/tasks/active/<id>.md`. |
| `zepher task list` | `[-s, --status <status>]` | List tasks filtered by status (`active`, `completed`, `blocked`, `all`, default `active`). |
| `zepher task show <id>` | `<id>` | View full task specifications, objectives, and status logs. |
| `zepher task complete <id>` | `<id>` | Mark task as completed and automatically archive to `.zepher/tasks/completed/<id>.md`. |
| `zepher task block <id>` | `[-r, --reason <reason>]` | Mark task as blocked with an optional diagnostic reason, moving to `.zepher/tasks/blocked/<id>.md`. |

### 🏛️ Architecture Decisions (`zepher adr`)
| Command | Options / Arguments | Description |
|---|---|---|
| `zepher adr create <title>` | `[-s, --status <status>]`<br>`[-c, --context <text>]`<br>`[-d, --decision <text>]`<br>`[-a, --alternatives <text>]` | Create a structured Architectural Decision Record in `.zepher/decisions/ADR-XXXX-<title>.md`. |
| `zepher adr list` | — | List all recorded ADRs with ID, status (`Proposed`, `Accepted`, `Deprecated`, `Superseded`), and date. |
| `zepher adr show <query>` | `<query>` | View complete markdown content of an ADR by ID number, filename, or title keyword. |

### 🔒 Team Vault (`zepher vault`)
| Command | Options / Arguments | Description |
|---|---|---|
| `zepher vault track <path>` | `[-t, --type <type>]` | Track private configuration or secret (`secret`, `seed`, `binary`, `doc`) and automatically guard in `.gitignore`. |
| `zepher vault seal` | `[-p, --passphrase <key>]` | Encrypt all tracked files into AES-256-GCM encrypted envelopes in `.zepher/vault/*.enc`. |
| `zepher vault unseal` | `[-p, --passphrase <key>]` | Decrypt vault files into workspace with 3-way non-destructive merge to protect local edits. |
| `zepher vault status` | — | Inspect tracked files, seal state, and unsealed dirty modifications. |

### 📦 Asset Hub (`zepher asset`)
| Command | Options / Arguments | Description |
|---|---|---|
| `zepher asset track <path>` | `[-t, --tag <tag>]` | Track heavy binary, dataset, database seed, or test fixture with optional release tag. |
| `zepher asset stash <path>` | — | Compute SHA-256 hash and stash tracked file to local or remote blob store. |
| `zepher asset pull <path>` | — | Restore tracked binary from blob store with cryptographic checksum verification. |

### 🔌 Integrations & Interactive TUI (`zepher integrate`)
| Command | Options / Arguments | Description |
|---|---|---|
| `zepher integrate` | — | Launch interactive Terminal UI (TUI) to browse, toggle, and inspect external agent integrations. |
| `zepher integrate status` | — | Display status of all registered integrations (`codebase-memory-mcp`, `Graphify`, `ECC`). |
| `zepher integrate enable <id>` | `<id>` | Enable a registered integration for the workspace. |
| `zepher integrate disable <id>` | `<id>` | Disable a registered integration. |
| `zepher integrate doctor` | — | Run health checks and diagnostics on external integration connectors. |

### 🚀 MCP Server Command
| Command | Options / Arguments | Description |
|---|---|---|
| `zepher mcp` | — | Launch the native Stdio Model Context Protocol (MCP v2) server for AI agent communication. |

---

## 🤖 Zepher Agent Commands & Integration Reference

Zepher equips AI coding agents (**Claude Code**, **Cursor**, **Gemini / Antigravity**, **Windsurf**) with programmatic access to project state, memory, tasks, rules, and synchronization through standard protocols and runtime conventions.

### 1. Model Context Protocol (MCP v2) Tool Suite
When running via `zepher mcp`, Zepher exposes **14 structured tools** adhering to the MCP specification:

| Tool Name | Arguments & Types | Return Output | Agent Purpose & Description |
|---|---|---|---|
| `zepher_project_context` | `projectRoot` (string, required) | Markdown formatted context string | Retrieve complete composite architectural summary, stack standards, active tasks, blockers, ADRs, and memory conventions. |
| `zepher_search_memory` | `projectRoot` (string, required)<br>`query` (string, required) | JSON array: `[{ file, scope, content }]` | Safe regex query across persistent local and global memory notes with secret leakage filters. |
| `zepher_write_memory` | `projectRoot` (string, required)<br>`type` ('project' \| 'architecture' \| 'conventions' \| 'constraints' \| 'lessons', required)<br>`content` (string, required) | Text string: `'Saved'` or `'Failed'` | Append new discoveries, constraints, stack lessons, and conventions to persistent memory. |
| `zepher_task_create` | `projectRoot` (string, required)<br>`name` (string, required) | Text string: Task ID (e.g. `task-1725890000000`) | Decompose larger objectives into atomic tracked tasks inside `.zepher/tasks/active/`. |
| `zepher_task_list` | `projectRoot` (string, required) | JSON array of active task filenames/IDs | Query the active backlog of project tasks to select or sequence next implementation steps. |
| `zepher_task_complete` | `projectRoot` (string, required)<br>`taskId` (string, required) | Text string: `'Completed'` or `'Task not found'` | Close an active or blocked task, automatically archiving the task record to `.zepher/tasks/completed/`. |
| `zepher_task_block` | `projectRoot` (string, required)<br>`taskId` (string, required)<br>`reason` (string, optional) | Text string: `'Blocked'` or `'Task not found'` | Move a task to `.zepher/tasks/blocked/` with a diagnostic explanation of why progress is halted. |
| `zepher_decision_create` | `projectRoot` (string, required)<br>`title` (string, required)<br>`status` ('Proposed' \| 'Accepted' \| 'Deprecated' \| 'Superseded', optional)<br>`context` (string, optional)<br>`decision` (string, optional)<br>`alternatives` (string, optional)<br>`tradeoffs` (string, optional)<br>`consequences` (string, optional) | Text string: Created ADR filename (e.g. `ADR-0003-use-vite.md`) | Formally record an Architectural Decision Record (ADR) in `.zepher/decisions/` to prevent future regressions. |
| `zepher_decision_list` | `projectRoot` (string, required) | JSON array: `[{ id, title, status, date, path }]` | List all historical and accepted architectural decisions to ensure proposed code conforms to decisions. |
| `zepher_get_rules` | `projectRoot` (string, required) | JSON array of rules with IDs, priorities, globs, and tags | Introspect all unified local and global engineering constraints and conventions currently active. |
| `zepher_add_rule` | `projectRoot` (string, required)<br>`content` (string, required)<br>`title` (string, optional)<br>`priority` (number, optional 1-100)<br>`tags` (string[], optional)<br>`globs` (string[], optional)<br>`alwaysApply` (boolean, optional)<br>`global` (boolean, optional) | JSON object: `{ filePath, rule }` | Programmatically codify a new engineering rule or constraint directly from agent observations. |
| `zepher_list_skills` | `projectRoot` (string, required) | JSON object: `{ global: Skill[], local: Skill[] }` | Enumerate all available skills, workflows, and procedures across global and project installations. |
| `zepher_sync` | `projectRoot` (string, required)<br>`dryRun` (boolean, optional)<br>`force` (boolean, optional)<br>`adapter` (string, optional) | JSON object with compilation summary and touched file lists | Programmatically re-compile vendor agent configurations after adding rules, skills, or constraints. |
| `zepher_generate_handoff` | `projectRoot` (string, required) | Text string: Handoff file path (e.g. `.zepher/handoffs/2026-09-10T12-00.md`) | Synthesize an actionable handoff snapshot capturing current git branch, uncommitted diffs, and remaining tasks. |

### 2. Autonomous Agent Lifecycle Protocol (`AGENTS.md`)
Zepher establishes a standard operational protocol for autonomous agents operating in the workspace:

```mermaid
flowchart LR
    A["1. Pre-Work Discovery"] --> B["2. In-Work Execution"]
    B --> C["3. Post-Work Handoff"]

    subgraph A ["1. Pre-Work Discovery"]
        A1["zepher_project_context"] --> A2["zepher_task_list"]
        A2 --> A3["zepher_decision_list"]
    end

    subgraph B ["2. In-Work Execution"]
        B1["zepher_task_create"] --> B2["Implement Code"]
        B2 --> B3["zepher_decision_create"]
        B2 -.->|"Hit Blocker"| B4["zepher_task_block"]
    end

    subgraph C ["3. Post-Work Handoff"]
        C1["zepher_task_complete"] --> C2["zepher_write_memory"]
        C2 --> C3["zepher_generate_handoff"]
        C3 --> C4["zepher_sync"]
    end
```

- **Phase 1: Pre-Work Discovery**
  1. Call `zepher_project_context` or read `.zepher/context/current.md` to load project constraints and architecture.
  2. Call `zepher_task_list` to identify active backlog items.
  3. Call `zepher_decision_list` before proposing major architectural modifications to avoid violating established ADRs.
- **Phase 2: In-Work Execution**
  - Break complex workflows into atomic steps using `zepher_task_create`.
  - When encountering unresolvable issues or missing prerequisites, invoke `zepher_task_block` with an explicit reason.
  - When reaching an architectural consensus with the user, formalize it using `zepher_decision_create`.
- **Phase 3: Post-Work Handoff**
  - Conclude completed tasks with `zepher_task_complete`.
  - Record project lessons or non-obvious conventions with `zepher_write_memory`.
  - Synthesize a handoff snapshot with `zepher_generate_handoff` to preserve continuity for future agent turns.
  - If rules or skills were introduced, trigger `zepher_sync` to update native IDE configurations.

### 3. Agent Auto-Mounting Configurations
When `zepher sync` is executed, Zepher **automatically generates and deep-merges** native MCP registrations into agent config files:

#### Claude Code (`.claude.json`)
```json
{
  "mcpServers": {
    "zepher": {
      "command": "zepher",
      "args": ["mcp"]
    }
  }
}
```

#### Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "zepher": {
      "command": "zepher",
      "args": ["mcp"]
    }
  }
}
```

---

## 🤝 Supported Agent Adapters

| Vendor | Target Configuration | MCP Support | Hook Injection | Scoped Globs |
|---|---|:---:|:---:|:---:|
| **Cursor** | `.cursorrules` / `.cursor/rules/*.mdc` / `.cursor/mcp.json` | ✅ Native | ✅ | ✅ Native |
| **Claude Code** | `CLAUDE.md` / `.claude.json` / `~/.claude/skills` | ✅ Native | ✅ | ✅ |
| **Gemini / Antigravity** | `.gemini/rules/` / `~/.gemini/config/skills` | ✅ Native | ✅ | ✅ |
| **Windsurf** | `.windsurfrules` | Planned | ✅ | Planned |
| **GitHub Copilot** | `.github/copilot-instructions.md` | — | ✅ | Planned |

---

## 💻 Tech Stack & Contributing

Zepher is built as a modular TypeScript monorepo powered by **pnpm workspaces**:

- `@zepher/core`: State resolution, two-tier inheritance, checksum safety, Team Vault & Asset Hub, hooks runner.
- `@zepher/adapters`: Vendor compilers (Cursor, Claude, Windsurf, Copilot, Gemini), watch daemon, and drift verifier.
- `@zepher/rules`: Engineering rule management, priority sorting, and glob matching.
- `@zepher/skills`: Skill package manager, lockfile engine, skill harvester, and universal symlinking.
- `@zepher/memory`: Persistent facts, secret scanning, and semantic lookup.
- `@zepher/mcp`: Stdio Model Context Protocol server (v2 tools).
- `@zepher/integrations`: Connectors for Graphify, ECC, and codebase-memory.

```bash
# Clone and develop
git clone https://github.com/YUVARAJ-R-ai/zepher.git
cd zepher
pnpm install
pnpm build
pnpm test
```

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">

Made with ❤️ for the next generation of AI-assisted software engineers.

</div>
