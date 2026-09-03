import { AgentAdapter } from '@zepher/core';
export declare const ALL_ADAPTERS: AgentAdapter[];
export declare function getAdapter(id: string): AgentAdapter | undefined;
export declare function detectActiveAdapters(projectRoot: string): Promise<AgentAdapter[]>;
