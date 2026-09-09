# ADR-0002: Bundle CLI with esbuild for standalone npm distribution

## Status
Accepted

## Context
Monorepo workspace packages cannot be resolved when installed globally via npm install -g zepher-cli unless bundled or individually published to registry

## Decision
Use esbuild with --packages=external to bundle all internal workspace code into apps/cli/dist/index.js while retaining third-party dependencies as external runtime packages

## Alternatives


## Tradeoffs


## Consequences


## Date
2026-09-09
