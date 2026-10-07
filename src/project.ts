export function verifyProjectUrl(expectedUrl: string, actualUrl: string): void {
  const expected = new URL(expectedUrl);
  const actual = new URL(actualUrl);
  const match = expected.pathname.match(/^\/g\/(g-p-[^/]+)\/project\/?$/);
  if (!match) throw new Error("Invalid configured Project URL. Use a ChatGPT Project URL ending in /project.");
  if (actual.origin !== expected.origin || !actual.pathname.startsWith(`/g/${match[1]}/`)) {
    throw new Error(`PROJECT_MISMATCH: Expected Project ${match[1]}, got ${actual.pathname}.`);
  }
}
