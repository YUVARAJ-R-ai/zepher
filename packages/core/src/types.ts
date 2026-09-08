export interface Rule {
  id: string;             // e.g. "strict-typescript"
  title: string;          // Human-readable title
  content: string;        // The actual rule text / prompt instruction
  tags?: string[];        // Category tags: e.g. ["typescript", "linting", "backend"]
  priority?: number;      // 1-100, default 50. Higher priority rules are placed higher
  scope: 'global' | 'local';
  sourceFile?: string;    // Relative path where it came from
  override?: boolean;     // If true, local completely replaces matching global rule
  globs?: string[];       // File path globs (e.g. ["src/**/*.ts"]) for targeted rules
  alwaysApply?: boolean;  // Whether to always attach rule regardless of active file
}

export interface SkillMeta {
  name: string;
  description: string;
  version?: string;
  trigger?: string;
  scope: 'global' | 'local';
  path: string;           // Directory path containing SKILL.md
  content: string;        // Full SKILL.md markdown
}

export interface Hook {
  name: string;
  stage: 'pre-sync' | 'post-sync' | 'pre-commit' | 'post-commit';
  run: string;            // Shell command to execute
  scope: 'global' | 'local';
}

export interface LockfileEntry {
  source: string;
  version?: string;
  checksum: string;
  installedAt: string;
  scope: 'global' | 'local';
}

export interface ZepherLockfile {
  version: '1.0';
  skills: Record<string, LockfileEntry>;
}

export type VaultFileType = 'secret' | 'seed' | 'binary' | 'doc';

export interface VaultTrackedItem {
  path: string;           // Relative file path or glob pattern (e.g. ".env", "db/seeds/*.sql")
  type: VaultFileType;
  autoSeal?: boolean;
}

export interface VaultMember {
  username: string;       // GitHub username or identifier
  publicKey?: string;     // SSH/Age public key
  addedAt: string;
}

export interface VaultConfig {
  version: '1.0';
  members: VaultMember[];
  items: VaultTrackedItem[];
}

export interface VaultLockEntry {
  path: string;
  sha256: string;
  sealedAt: string;
  sealedBy?: string;
  envelopeFile: string;   // e.g. ".zepher/vault/dotenv.enc"
}

export interface VaultLockfile {
  version: '1.0';
  files: Record<string, VaultLockEntry>;
}

export interface AssetPointer {
  path: string;
  sha256: string;
  size: number;
  storage: 'local' | 'r2' | 's3' | 'ssh';
  location: string;       // Key or relative storage path
  tag?: string;
  updatedAt: string;
}

export interface AssetsLockfile {
  version: '1.0';
  assets: Record<string, AssetPointer>;
}

export interface ProjectMetadata {
  name: string;
  root: string;
  framework?: string;
  languages?: string[];
}

export interface UnifiedZepherState {
  project: ProjectMetadata;
  rules: Rule[];
  skills: SkillMeta[];
  hooks: Hook[];
  lockfile: ZepherLockfile;
}

export interface FileOutput {
  path: string;          // Relative path to project root
  content: string;
}

export interface DirectoryLink {
  targetPath: string;    // Relative path where directory/symlink should be placed
  sourcePath: string;    // Source directory
}

export interface JsonMerge {
  path: string;          // e.g. ".claude.json"
  patch: Record<string, any>; // Deep merge patch
}

export interface AdapterOutput {
  files: FileOutput[];
  directories?: DirectoryLink[];
  jsonMerges?: JsonMerge[];
}

export interface AgentAdapter {
  id: string;
  name: string;
  targetFiles: string[];
  detect(projectRoot: string): Promise<boolean> | boolean;
  compile(state: UnifiedZepherState, projectRoot: string): Promise<AdapterOutput> | AdapterOutput;
  import?(content: string, filePath: string): Partial<UnifiedZepherState>;
}
