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

  it('should allow normal text and engineering notes discussing security', () => {
    expect(containsSecret('this is a normal architecture decision')).toBe(false);
    expect(containsSecret('We should use PostgreSQL')).toBe(false);
    expect(containsSecret('We should hash user passwords with bcrypt before saving to PostgreSQL')).toBe(false);
    expect(containsSecret('Always retrieve the API token from environment variables rather than hardcoding')).toBe(false);
    expect(containsSecret('The secret sauce of our engine is caching')).toBe(false);
  });

  it('should detect known token formats and credentials', () => {
    expect(containsSecret('sk_live_1234567890abcdef123456')).toBe(true);
    expect(containsSecret('ghp_abcdefghijklmnopqrstuvwxyz1234567890')).toBe(true);
    expect(containsSecret('AKIAIOSFODNN7EXAMPLE')).toBe(true);
    expect(containsSecret('api_key = "abc12345678"')).toBe(true);
    expect(containsSecret('password: "supersecretpass"')).toBe(true);
  });
});
