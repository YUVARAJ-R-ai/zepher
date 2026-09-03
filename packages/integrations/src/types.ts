export interface DetectionResult {
  installed: boolean;
  version?: string;
  reason?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues?: string[];
}

export interface IntegrationStatus {
  enabled: boolean;
  running: boolean;
  details?: string;
}

export interface DiagnosticResult {
  healthy: boolean;
  checks: { name: string; passed: boolean; message?: string }[];
}

export interface ZepherIntegration {
  id: string;
  name: string;
  description: string;
  mode: 'auto' | 'optional';
  capabilities: string[];

  detect(projectRoot: string): Promise<DetectionResult>;
  validate(projectRoot: string): Promise<ValidationResult>;
  enable(projectRoot: string): Promise<void>;
  disable(projectRoot: string): Promise<void>;
  status(projectRoot: string): Promise<IntegrationStatus>;
  doctor(projectRoot: string): Promise<DiagnosticResult>;
}
