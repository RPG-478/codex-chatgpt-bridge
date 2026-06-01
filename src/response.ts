export type Verdict = "proceed" | "revise" | "blocked";

export type DelegationResponse = {
  verdict: Verdict;
  summary: string[];
  risks: string[];
  sources: string[];
  nextAction?: string;
  raw: string;
};

const verdictPattern = /^verdict:\s*(proceed|revise|blocked)\s*$/im;

export function parseDelegationResponse(raw: string): DelegationResponse {
  const text = raw.trim();
  const verdictMatch = text.match(verdictPattern);
  if (!verdictMatch) {
    throw new Error("Invalid ChatGPT response: missing verdict: proceed | revise | blocked.");
  }

  const parsed: DelegationResponse = {
    verdict: verdictMatch[1].toLowerCase() as Verdict,
    summary: parseSection(text, "summary"),
    risks: parseSection(text, "risks"),
    sources: parseSection(text, "sources"),
    nextAction: parseScalar(text, "next_action"),
    raw: text
  };

  if (parsed.summary.length === 0) {
    throw new Error("Invalid ChatGPT response: summary section must contain at least one item.");
  }

  return parsed;
}

export function formatDelegationResponse(response: DelegationResponse): string {
  const lines = [`verdict: ${response.verdict}`, "", "summary:"];
  lines.push(...response.summary.map((item) => `- ${item}`));

  if (response.risks.length > 0) {
    lines.push("", "risks:", ...response.risks.map((item) => `- ${item}`));
  }

  if (response.sources.length > 0) {
    lines.push("", "sources:", ...response.sources.map((item) => `- ${item}`));
  }

  if (response.nextAction) {
    lines.push("", `next_action: ${response.nextAction}`);
  }

  return `${lines.join("\n")}\n`;
}

function parseSection(text: string, sectionName: string): string[] {
  const section = extractSection(text, sectionName);
  if (!section) return [];

  const bulletItems = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);

  if (bulletItems.length > 0) return bulletItems;

  const prose = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  return prose ? [prose] : [];
}

function parseScalar(text: string, fieldName: string): string | undefined {
  const match = text.match(new RegExp(`^${escapeRegex(fieldName)}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim();
}

function extractSection(text: string, sectionName: string): string | undefined {
  const sectionPattern = new RegExp(
    `(?:^|\\r?\\n)${escapeRegex(sectionName)}:\\s*\\r?\\n([\\s\\S]*?)(?=\\r?\\n(?:verdict|summary|risks|sources|next_action):|\\s*$)`,
    "i"
  );
  return text.match(sectionPattern)?.[1]?.trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
