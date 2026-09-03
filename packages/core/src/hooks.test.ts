import { describe, it, expect } from 'vitest';
import { VALID_HOOK_STAGES } from './hooks.js';

describe('Hooks Engine', () => {
  it('defines valid hook stages', () => {
    expect(VALID_HOOK_STAGES).toContain('pre-sync');
    expect(VALID_HOOK_STAGES).toContain('post-sync');
    expect(VALID_HOOK_STAGES).toContain('pre-commit');
    expect(VALID_HOOK_STAGES).toContain('post-commit');
  });
});
