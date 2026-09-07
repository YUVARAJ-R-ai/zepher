<div align="center">

# ⚡ ZEPHER

### **The Universal Agent Environment Manager & Persistent Memory Layer**

*Context windows are temporary. Project knowledge is persistent.*

[![npm version](https://img.shields.io/badge/version-0.2.0-blue.svg?style=for-the-badge)](https://www.npmjs.com/package/zepher)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-green.svg?style=for-the-badge)](https://modelcontextprotocol.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](https://github.com/YUVARAJ-R-ai/zepher/pulls)

<p align="center">
  <a href="#-why-zepher">Why Zepher?</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-quickstart">Quickstart</a> •
  <a href="#-core-capabilities">Capabilities</a> •
  <a href="#-command-reference">CLI Reference</a> •
  <a href="#-mcp-server">MCP Server</a>
</p>

---

</div>

## 💡 Why Zepher?

Modern AI coding agents (**Claude Code**, **Cursor**, **Windsurf**, **GitHub Copilot**, **Gemini / Antigravity**) have created an operational nightmare:

- ❌ **Configuration Hell:** You are forced to duplicate rules across `.cursorrules`, `CLAUDE.md`, `.windsurfrules`, `.gemini/rules/`, and `.github/copilot-instructions.md`.
- ❌ **Agent Amnesia:** When conversation context runs out, agents forget architectural decisions (ADRs), stack constraints, and previous session discoveries.
- ❌ **Prompt Token Bloat:** Dumping entire logs and notes into prompt files burns thousands of tokens on every single user request.
- ❌ **Unenforced Quality:** You constantly have to remind agents to *"run tests before finishing"*.

### **The Zepher Solution**

**Zepher acts as the single source of truth for your entire agent ecosystem.** You define rules, skills, and hooks once (globally or per-project). Zepher deterministically compiles and synchronizes them into vendor-native files with checksum watermarks, runs automated lifecycle hooks, and exposes long-term memory via native Stdio MCP.

---

## 🏗️ Architecture

```
                       ┌─────────────────────────────────────┐
                       │   Global Scope (~/.zepher/)         │
                       │   • Engineering standards & rules   │
                       │   • Global skills & cross-repo hooks│
                       └──────────────────┬──────────────────┘
                                          │
                                          ▼  Inheritance & Overrides
                       ┌─────────────────────────────────────┐
                       │   Local Scope (<project>/.zepher/)  │
                       │   • Project ADRs & stack rules      │
                       │   • Active tasks & session handoffs │
                       │   • Project skills & local hooks    │
                       └──────────────────┬──────────────────┘
                                          │
                            [ Zepher Unified Engine ]
                                          │
         ┌───────────────────┬────────────┴───────┬───────────────────┐
         ▼                   ▼                    ▼                   ▼
    ┌──────────┐       ┌───────────┐        ┌───────────┐       ┌───────────┐
    │  Cursor  │       │Claude Code│        │ Windsurf  │       │Copilot /  │
    │  Adapter │       │  Adapter  │        │  Adapter  │       │  Gemini   │
    └────┬─────┘       └─────┬─────┘        └─────┬─────┘       └─────┬─────┘
         ▼                   ▼                    ▼                   ▼
   .cursorrules         CLAUDE.md &          .windsurfrules      .github/ /
                        .claude.json                             .gemini/
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
# Output: 0.2.0
```

### 2. Initialize in 5 Seconds

Initialize your current repository and bootstrap your global environment:
```bash
# In your project root:
zepher init
```
*✨ This creates `.zepher/` locally and initializes `~/.zepher/` for personal global configurations without overwriting any existing code.*

### 3. Add Rules & Synchronize

```bash
# Add a local rule with priority
zepher rule add "Use Next.js 15 App Router with Tailwind CSS" -t "Framework Standards" -p 90

# Add a personal global rule that applies to every project on your machine
zepher rule add "Never use 'any' in TypeScript; prefer 'unknown'" -t "Strict Typing" -p 95 -g

# Synchronize across all AI agents (.cursorrules, CLAUDE.md, etc.)
zepher sync
```

---

## ⚡ Core Capabilities

### 1. 🌐 Universal Rules Engine & Inheritance
Manage your engineering standards in one place.
- **Priority-Driven:** Rules are sorted by priority (1–100). Critical constraints appear at the top of generated agent instructions.
- **Two-Tier Inheritance:** Global rules from `~/.zepher/rules/` are seamlessly merged with project-local rules from `.zepher/rules/`. Local rules override global rules matching the same ID.
- **Token Efficiency:** Memory and historical logs are strictly partitioned and never dumped into prompt files.

### 2. 🔄 Non-Destructive Sync & Safety Watermarks
- **Safety First:** Files generated by Zepher feature an auto-generated cryptographic header:
  ```markdown
  <!-- AUTO-GENERATED BY ZEPHER — DO NOT EDIT DIRECTLY -->
  <!-- Last synced: 2026-09-07T... | Checksum: 384480f8b91a -->
  <!-- To modify, update rules in .zepher/rules/ or run `zepher rule add` -->
  ```
- **Zero Accidental Overwrites:** If an existing hand-crafted `CLAUDE.md` or `.cursorrules` does not have a Zepher watermark, `zepher sync` halts and asks you to run `zepher import` or supply `--force`.
- **Dry-Run Preview:** Run `zepher sync --dry-run` to preview file operations and JSON patches without touching the disk.

### 3. 📥 Reverse Ingestion (`zepher import`)
Migrating an existing codebase to Zepher?
```bash
zepher import
```
Zepher automatically scans existing `.cursorrules`, `CLAUDE.md`, `.windsurfrules`, and `copilot-instructions.md`, extracts individual rules, and preserves your setup inside `.zepher/rules/`.

### 4. 🪝 Universal Lifecycle Hooks & Git Hook Bridge
Enforce quality across all agents without repeating yourself:
- **Stages:** `pre-sync`, `post-sync`, `pre-commit`, `post-commit`.
- **Git Hook Bridge:** Run `zepher hook install-git` to wire Zepher's verification hooks directly into `.git/hooks/pre-commit`.
- **Prompt Injection:** When hooks exist, `zepher sync` automatically injects mandatory pre-commit verification checklists into `.cursorrules` and `CLAUDE.md`.

```bash
# Add a pre-commit test runner
zepher hook add test-runner -s pre-commit -r "npm test"

# Bridge into Git
zepher hook install-git

# Sync to prompt files
zepher sync
```

### 5. 📦 Portable Skill Package Manager
Install portable agent workflows and procedures with SHA-256 lockfile tracking:
```bash
# Install locally or globally from local folder or GitHub URL
zepher skill install https://github.com/organization/react-best-practices -g

# Inspect installed skills
zepher skill list
```

### 6. 🔌 External Intelligence Integrations
Zepher coordinates with external tools through an interactive terminal TUI:
```bash
zepher integrate
```
- **codebase-memory-mcp:** Tactical LSP symbol navigation & definitions.
- **Graphify:** Structural AST & semantic knowledge graphs.
- **Everything Claude Code (ECC):** Portable engineering workflows and agent practices.

---

## 📖 Command Reference

### 🛠️ Rules (`zepher rule`)
| Command | Description |
|---|---|
| `zepher rule add <content> [-t <title>] [-p <priority>] [-g]` | Add a new rule (local or global) |
| `zepher rule list` | List all active local and global rules with IDs & priorities |
| `zepher rule remove <id> [-g]` | Remove a rule by ID |

### 🔄 Sync & Import
| Command | Description |
|---|---|
| `zepher sync` | Compile state into all detected AI agent configurations |
| `zepher sync --dry-run` | Preview file modifications without writing to disk |
| `zepher sync --force` | Overwrite unmanaged or hand-edited files |
| `zepher sync -a <adapter>` | Compile only for a specific vendor (`cursor`, `claude`, `windsurf`, `copilot`, `gemini`) |
| `zepher import [-f]` | Import existing `.cursorrules`, `CLAUDE.md`, etc. into Zepher rules |

### 🪝 Lifecycle Hooks (`zepher hook`)
| Command | Description |
|---|---|
| `zepher hook add <name> -s <stage> -r "<cmd>" [-g]` | Register an automated hook |
| `zepher hook list` | View all registered local and global hooks |
| `zepher hook run <stage>` | Manually execute hooks for a stage (`pre-commit`, etc.) |
| `zepher hook install-git` | Install Zepher pre-commit bridge into `.git/hooks/` |
| `zepher hook uninstall-git` | Remove Zepher bridge from `.git/hooks/` |

### 🧠 Skills & Memory
| Command | Description |
|---|---|
| `zepher skill install <source> [-n <name>] [-g]` | Install a skill from local path or remote GitHub URL |
| `zepher skill list` | List all installed skills and provenance |
| `zepher skill remove <name> [-g]` | Remove an installed skill |
| `zepher remember "<fact>" -t <type>` | Record persistent fact (`architecture`, `conventions`, etc.) |
| `zepher recall "<query>"` | Semantic lookup across stored memory |
| `zepher context` | Generate structured markdown summary of project state |
| `zepher handoff` | Create an actionable session handoff note |
| `zepher doctor` | Validate health of context, files, and integrations |

---

## 🤖 Stdio MCP Server

Zepher runs as a Model Context Protocol (MCP) server so your AI agent can query context, tasks, and memory on-demand:

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

### Available MCP Tools
- `zepher_project_context`: Retrieve full architectural summary, tasks, and conventions.
- `zepher_search_memory`: Search persistent project knowledge.
- `zepher_write_memory`: Append new discoveries and conventions to memory.
- `zepher_task_create` / `zepher_task_list`: Manage active project tasks.
- `zepher_generate_handoff`: Create a seamless handoff note for the next agent session.

---

## 🤝 Supported Agent Adapters

| Vendor | Target Configuration | MCP Support | Hook Injection |
|---|---|:---:|:---:|
| **Cursor** | `.cursorrules` / `.cursor/rules/` | Planned | ✅ |
| **Claude Code** | `CLAUDE.md` / `.claude.json` | ✅ Native | ✅ |
| **Windsurf** | `.windsurfrules` | Planned | ✅ |
| **GitHub Copilot** | `.github/copilot-instructions.md` | — | ✅ |
| **Gemini / Antigravity** | `.gemini/rules/zepher-rules.md` | ✅ Native | ✅ |

---

## 💻 Tech Stack & Contributing

Zepher is built as a modular TypeScript monorepo powered by **pnpm workspaces**:

- `@zepher/core`: State resolution, two-tier inheritance, checksum safety, hooks runner.
- `@zepher/adapters`: Vendor compilers for Cursor, Claude, Windsurf, Copilot, Gemini.
- `@zepher/rules`: Engineering rule management and priority sorting.
- `@zepher/skills`: Skill package manager and lockfile engine.
- `@zepher/memory`: Persistent facts, secret scanning, and semantic lookup.
- `@zepher/mcp`: Stdio Model Context Protocol server.
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
