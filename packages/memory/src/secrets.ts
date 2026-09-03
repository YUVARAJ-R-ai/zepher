const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /token/i,
  /secret/i,
  /password/i,
  /credential/i,
  /private[_-]?key/i,
  /sk_live_[a-zA-Z0-9]+/,
  /sk_test_[a-zA-Z0-9]+/
];

export function containsSecret(content: string): boolean {
  return SECRET_PATTERNS.some(pattern => pattern.test(content));
}
