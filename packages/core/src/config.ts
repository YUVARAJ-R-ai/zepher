import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { ZEPHER_DIR, CONFIG_FILE } from './constants.js';

export interface ZepherConfig {
  version: number;
  memory: {
    backend: string;
    semantic_search: boolean;
  };
  context: {
    max_size: string | number;
  };
  integrations: {
    codebase_memory_mcp: string;
    graphify: string;
  };
  security: {
    secret_detection: boolean;
  };
  workflow: {
    require_plan_for_features: boolean;
    require_review: boolean;
    require_handoff: boolean;
  };
}

export const DEFAULT_CONFIG: ZepherConfig = {
  version: 1,
  memory: {
    backend: 'markdown',
    semantic_search: false,
  },
  context: {
    max_size: 'auto',
  },
  integrations: {
    codebase_memory_mcp: 'auto',
    graphify: 'optional',
  },
  security: {
    secret_detection: true,
  },
  workflow: {
    require_plan_for_features: true,
    require_review: true,
    require_handoff: true,
  }
};

export function loadConfig(projectRoot: string): ZepherConfig {
  const configPath = path.join(projectRoot, ZEPHER_DIR, CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }
  try {
    const fileContent = fs.readFileSync(configPath, 'utf-8');
    const config = yaml.parse(fileContent);
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.error(`Error loading configuration from ${configPath}`, error);
    return DEFAULT_CONFIG;
  }
}
