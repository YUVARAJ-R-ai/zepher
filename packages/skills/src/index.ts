import fs from 'fs';
import path from 'path';
import { ZEPHER_DIR, SKILLS_DIR } from '@zepher/core';

export function installSkill(projectRoot: string, name: string, content: string): string {
  const dirPath = path.join(projectRoot, ZEPHER_DIR, SKILLS_DIR);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  const targetPath = path.join(dirPath, name);
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
  
  const mdPath = path.join(targetPath, 'SKILL.md');
  fs.writeFileSync(mdPath, content);
  
  return mdPath;
}

export function getFrontendSkillContent(): string {
  return `---
name: frontend
description: Generates production-grade frontend features without AI slop
---

# Frontend Skill

This skill helps AI agents write high-quality frontend code.

## Procedure
1. Define Requirements
2. Map User Roles
3. Design Information Architecture
4. Create Screen Inventory
5. Interaction Model
6. Visual Direction
7. Prototype
8. Implementation

## Anti-patterns
- generic gradients
- random cards
- meaningless glassmorphism
- AI-slop aesthetics

## Output
Clean, hierarchical, task-oriented screens with consistent typography.
`;
}
