#!/usr/bin/env bash
for pkg in core memory context tasks decisions sessions workflows skills integrations mcp; do
  cat << PKG_EOF > packages/$pkg/package.json
{
  "name": "@zepher/$pkg",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
PKG_EOF
  
  cat << TS_EOF > packages/$pkg/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
TS_EOF

  touch packages/$pkg/src/index.ts
done

# CLI app
cat << CLI_EOF > apps/cli/package.json
{
  "name": "zepher",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "bin": {
    "zepher": "./bin/zepher.js"
  },
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist",
    "start": "node ./bin/zepher.js"
  },
  "dependencies": {
    "@zepher/core": "workspace:*",
    "@zepher/memory": "workspace:*",
    "@zepher/context": "workspace:*",
    "@zepher/tasks": "workspace:*",
    "@zepher/decisions": "workspace:*",
    "@zepher/sessions": "workspace:*",
    "@zepher/workflows": "workspace:*",
    "@zepher/skills": "workspace:*",
    "@zepher/integrations": "workspace:*",
    "@zepher/mcp": "workspace:*",
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "yaml": "^2.4.1"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "@types/node": "^20.12.7"
  }
}
CLI_EOF

mkdir -p apps/cli/bin
cat << BIN_EOF > apps/cli/bin/zepher.js
#!/usr/bin/env node
import '../dist/index.js';
BIN_EOF
chmod +x apps/cli/bin/zepher.js

cat << TS_EOF > apps/cli/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
TS_EOF
touch apps/cli/src/index.ts

