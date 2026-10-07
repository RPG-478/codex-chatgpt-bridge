// Block high-confidence credentials before a prompt or job packet is persisted.
const secretPatterns: { label: string; pattern: RegExp }[] = [
  { label: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/i },
  { label: "API token", pattern: /\b(?:sk-(?:proj-|svcacct-|live-|test-)?[A-Za-z0-9_-]{20,}|rk_live_[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{30,}|xox[baprs]-[A-Za-z0-9-]{20,}|AIza[A-Za-z0-9_-]{35})\b/i },
  { label: "AWS access key", pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { label: "bearer token", pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{20,}={0,2}\b/i },
  { label: "JWT", pattern: /\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\b/ },
  { label: "credential assignment", pattern: /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password)\b\s*[:=]\s*["']?[^\s"']{16,}/i }
];

export function assertNoSecrets(question: string, context: string): void {
  for (const [field, value] of [["question", question], ["context", context]] as const) {
    for (const { label, pattern } of secretPatterns) {
      if (pattern.test(value)) {
        throw new Error(`SECRET_DETECTED: ${label} in ${field}. Remove or redact it before delegation. No prompt was saved or sent.`);
      }
    }
  }
}
