const SECRET_PATTERNS = [
  // Key-value assignments with values (e.g., api_key = "...", token: '...', password is secretvalue)
  /(?:password|secret|token|api[_-]?key|credential|private[_-]?key)\s*(?:[:=]|\bis\b)\s*["']?[^"'\s\n]{3,}["']?/i,
  // Common service tokens and secret prefixes
  /sk_live_[a-zA-Z0-9]{16,}/,
  /sk_test_[a-zA-Z0-9]{16,}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /gho_[a-zA-Z0-9]{36}/,
  /xoxb-[0-9]{11,}/,
  /xoxp-[0-9]{11,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/
];

export function containsSecret(content: string): boolean {
  return SECRET_PATTERNS.some(pattern => pattern.test(content));
}
