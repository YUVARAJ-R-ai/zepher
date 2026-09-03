# Zepher

Zepher is a persistent, Git-native context and memory infrastructure for AI coding agents.

> Context windows are temporary. Project knowledge is persistent.

Zepher solves the fundamental problem of AI agents forgetting architecture decisions, conventions, constraints, and past context. It moves persistent project knowledge out of the conversation and into a structured project context layer.

## Architecture

Zepher provides infrastructure to agents that write code:
- Claude Code
- Antigravity
- Codex
- Cursor
- Gemini

## Installation

\`\`\`bash
npm install -g zepher
\`\`\`

## Quickstart

Initialize Zepher in your project:
\`\`\`bash
zepher init
\`\`\`

View project status:
\`\`\`bash
zepher status
\`\`\`

Remember a fact:
\`\`\`bash
zepher remember "Use Next.js App Router" -t architecture
\`\`\`

Search memory:
\`\`\`bash
zepher recall "Next.js"
\`\`\`

Manage tasks:
\`\`\`bash
zepher task create "Implement Authentication"
zepher task list
\`\`\`

Manage decisions (ADRs):
\`\`\`bash
zepher decision create "Use Supabase"
\`\`\`

Handoff between sessions:
\`\`\`bash
zepher handoff
\`\`\`

Check setup:
\`\`\`bash
zepher doctor
\`\`\`

## MCP Server

Zepher provides an MCP interface for agents. You can run the server directly:
\`\`\`bash
zepher mcp
\`\`\`

## License

MIT
