<div align="center">

# ⚡ ZEPHER

### **The Universal Agent Environment Manager, Persistent Memory Layer & Team Vault**

*Context windows are temporary. Project knowledge and standards are persistent.*

[![npm version](https://img.shields.io/badge/version-0.3.0-blue.svg?style=for-the-badge)](https://www.npmjs.com/package/zepher)
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
  <a href="#-command-reference">CLI Reference</a> •
  <a href="#-mcp-server-v2">MCP Server v2</a>
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
                               [ Zepher Unified Engine v0.3.0 ]
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
npm install -g zepher
```

Verify the installation:
```bash
zepher --version
# Output: 0.3.0
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

---

## 📖 Command Reference

### 🛠️ Rules (`zepher rule`)
| Command | Description |
|---|---|
| `zepher rule add <content> [-t <title>] [-p <priority>] [--globs <pattern>] [--always-apply] [-g]` | Add a new rule (local or global) with priority and file glob matching |
| `zepher rule list` | List all active local and global rules with IDs, priorities, and globs |
| `zepher rule remove <id> [-g]` | Remove a rule by ID |

### 🔄 Sync, Watch & Verify
| Command | Description |
|---|---|
| `zepher sync` | Compile state into all detected AI agent configurations |
| `zepher sync --dry-run` | Preview file modifications without writing to disk |
| `zepher sync --force` | Overwrite unmanaged or hand-edited files |
| `zepher sync -a <adapter>` | Compile only for a specific vendor (`cursor`, `claude`, `windsurf`, `copilot`, `gemini`) |
| `zepher watch` | Background daemon that auto-syncs on any changes to `.zepher/` |
| `zepher verify` | CI/CD verification tool to detect configuration drift |
| `zepher import [-f]` | Ingest existing `.cursorrules`, `CLAUDE.md`, etc. into Zepher rules |

### 🔒 Team Vault (`zepher vault`)
| Command | Description |
|---|---|
| `zepher vault track <path> [-t <type>]` | Track a private file in the vault (auto-adds to `.gitignore`) |
| `zepher vault seal [-p <passphrase>]` | Encrypt all tracked files into AES-256-GCM vault envelopes |
| `zepher vault unseal [-p <passphrase>]` | Decrypt vault files into workspace with 3-way non-destructive merge |
| `zepher vault status` | Check tracking, dirty status, and synchronization state |

### 📦 Asset Hub (`zepher asset`)
| Command | Description |
|---|---|
| `zepher asset track <path> [-t <tag>]` | Track a binary, database seed, or test fixture |
| `zepher asset stash <path>` | Stash tracked asset to store with SHA-256 hashing |
| `zepher asset pull <path>` | Restore asset from store with cryptographic verification |

### 🧠 Skills (`zepher skill`)
| Command | Description |
|---|---|
| `zepher skill harvest [-l] [--overwrite]` | Discover and ingest skills from all agent directories into Zepher |
| `zepher skill link [--copy]` | Symlink Zepher skills to Antigravity, Claude Code, and Cursor |
| `zepher skill install <source> [-n <name>] [-g]` | Install a skill from local path or remote GitHub repository |
| `zepher skill list` | List all installed skills, locations, and provenance |
| `zepher skill remove <name> [-g]` | Remove an installed skill |

### 🪝 Lifecycle Hooks (`zepher hook`)
| Command | Description |
|---|---|
| `zepher hook add <name> -s <stage> -r "<cmd>" [-g]` | Register an automated hook (`pre-sync`, `post-sync`, `pre-commit`, `post-commit`) |
| `zepher hook list` | View all registered local and global hooks |
| `zepher hook run <stage>` | Manually execute hooks for a stage |
| `zepher hook install-git` | Install Zepher pre-commit bridge into `.git/hooks/` |
| `zepher hook uninstall-git` | Remove Zepher bridge from `.git/hooks/` |

### 📝 Context & Memory
| Command | Description |
|---|---|
| `zepher remember "<fact>" -t <type>` | Record persistent fact (`architecture`, `conventions`, `constraints`, `lessons`) |
| `zepher recall "<query>"` | Semantic lookup across stored memory |
| `zepher context` | Generate structured markdown summary of project state |
| `zepher handoff` | Create an actionable session handoff note for the next agent |
| `zepher doctor` | Validate health of context, files, and integrations |
| `zepher capabilities` | Print matrix of active core features and integrations |

---

## 🤖 MCP Server v2

Zepher runs as a Model Context Protocol (MCP) server so your AI agent can query rules, memory, and tasks programmatically:

```bash
zepher mcp
```

### Auto-Configuration
When you run `zepher sync`, Zepher **automatically updates `.claude.json`** using safe deep JSON merging to mount the Zepher MCP server:

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

### Available MCP v2 Tools

| Tool | Description |
|---|---|
| `zepher_project_context` | Retrieve composite architectural summary, tasks, and conventions. |
| `zepher_get_rules` | Query all active engineering rules and constraints (with priorities and globs). |
| `zepher_add_rule` | Programmatically register a new engineering rule from within an agent conversation. |
| `zepher_list_skills` | List all installed portable agent skills across global and project scopes. |
| `zepher_sync` | Programmatically trigger synchronization of agent configurations. |
| `zepher_search_memory` | Search persistent memory facts and architectural notes. |
| `zepher_write_memory` | Append new discoveries, constraints, and conventions to memory. |
| `zepher_task_create` | Create a new project task in `.zepher/tasks/active/`. |
| `zepher_task_list` | List active project tasks. |
| `zepher_generate_handoff` | Create an actionable handoff note for the next agent session. |

---

## 🤝 Supported Agent Adapters

| Vendor | Target Configuration | MCP Support | Hook Injection | Scoped Globs |
|---|---|:---:|:---:|:---:|
| **Cursor** | `.cursorrules` / `.cursor/rules/*.mdc` | Planned | ✅ | ✅ Native |
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
