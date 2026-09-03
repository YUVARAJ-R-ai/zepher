export interface ImportResult {
    importedCount: number;
    files: string[];
    skipped: string[];
}
export declare function importExistingConfigs(projectRoot: string, options?: {
    force?: boolean;
}): Promise<ImportResult>;
