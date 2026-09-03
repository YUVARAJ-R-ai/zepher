import { describe, it, expect } from 'vitest';
import { containsSecret } from './secrets.js';

describe('Secret Detection', () => {
  it('should detect API keys', () => {
    expect(containsSecret('my api_key is xyz')).toBe(true);
    expect(containsSecret('export const apiKey = "abc"')).toBe(true);
  });

  it('should detect tokens', () => {
    expect(containsSecret('github_token=123')).toBe(true);
  });

  it('should allow normal text', () => {
    expect(containsSecret('this is a normal architecture decision')).toBe(false);
    expect(containsSecret('We should use PostgreSQL')).toBe(false);
  });
});
