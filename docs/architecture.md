# Architecture

Zepher is built as a monorepo with separate concern layers:

- \`apps/cli\`: The primary interface.
- \`packages/core\`: Core logic, initialization, configurations.
- \`packages/memory\`: Memory operations and secret detection.
- \`packages/context\`: Generates context payload.
- \`packages/tasks\`, \`decisions\`, \`sessions\`: Project management state tracking.
- \`packages/skills\`, \`workflows\`: Extendable capabilities.
- \`packages/mcp\`: The model context protocol server.

This layered architecture ensures there are no circular dependencies and the codebase is easy to maintain.
