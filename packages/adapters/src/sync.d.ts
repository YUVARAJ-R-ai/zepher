export interface SyncOptions {
    dryRun?: boolean;
    force?: boolean;
    adapter?: string;
}
export interface SyncResult {
    success: boolean;
    adaptersRun: string[];
    filesWritten: string[];
    filesSkipped: {
        file: string;
        reason: string;
    }[];
    jsonMerged: string[];
    hooksRun: number;
}
export declare function runSync(projectRoot: string, options?: SyncOptions): Promise<SyncResult>;
