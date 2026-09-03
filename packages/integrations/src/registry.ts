import { ZepherIntegration } from './types.js';
import { codebaseMemoryAdapter } from './adapters/codebase-memory.js';
import { graphifyAdapter } from './adapters/graphify.js';
import { eccAdapter } from './adapters/ecc.js';

export const INTEGRATIONS: ZepherIntegration[] = [
  codebaseMemoryAdapter,
  graphifyAdapter,
  eccAdapter
];

export function getIntegration(id: string): ZepherIntegration | undefined {
  return INTEGRATIONS.find(i => i.id === id);
}

export function getAllIntegrations(): ZepherIntegration[] {
  return INTEGRATIONS;
}
