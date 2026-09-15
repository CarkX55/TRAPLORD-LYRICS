export interface ContaminationFinding {
  token: string;
  category: "instructional_leak" | "diagnostic_leak" | "template_leak" | "allowed_user_term" | "structural_term";
  severity: "info" | "warning" | "critical";
  reason: string;
}

export interface PromptHygieneReport {
  isClean: boolean;
  score: number; // 0 to 100
  criticalCount: number;
  warningCount: number;
  findings: ContaminationFinding[];
}

// Internal instructional sequences that should NEVER leak verbatim into user lyrics
const FORBIDDEN_INSTRUCTIONAL_SEQUENCES = [
  "fumo loud",
  "veo el futuro",
  "same squad",
  "los números en la mesa",
  "billetes azules",
  "anti-coro escolar",
  "prohibición radical",
  "call & response dialéctico",
  "pocket american bounce",
  "anáfora de anclaje",
  "triplet ostinato"
];

// Structural terms that are natural and permissible in hip-hop lyrics
const STRUCTURAL_ALLOWED_WORDS = new Set([
  "clean", "clear", "facts", "yeah", "up", "never", "always", "truuu", "bounce", "drop",
  "cut", "pause", "intro", "verse", "chorus", "hook", "outro", "beat", "sauce", "wuh"
]);

/**
 * Audits generated lyrics for accidental prompt contamination / instructional vocabulary reuse.
 */
export function auditPromptContamination(
  lyrics: string,
  userExplicitTokens: string[] = []
): PromptHygieneReport {
  const findings: ContaminationFinding[] = [];
  const lowerLyrics = lyrics.toLowerCase();

  // Normalize user tokens
  const userAllowed = new Set(
    userExplicitTokens.map(t => t.toLowerCase().trim()).filter(Boolean)
  );

  // 1. Check exact forbidden instructional sequences (CRITICAL)
  for (const seq of FORBIDDEN_INSTRUCTIONAL_SEQUENCES) {
    if (lowerLyrics.includes(seq)) {
      // Check if user explicitly asked for this exact sequence in customTopic
      if (userAllowed.has(seq)) {
        findings.push({
          token: seq,
          category: "allowed_user_term",
          severity: "info",
          reason: `El usuario incluyó explícitamente "${seq}" en su temática`,
        });
      } else {
        findings.push({
          token: seq,
          category: "instructional_leak",
          severity: "critical",
          reason: `Secuencia instructiva interna "${seq}" detectada en la letra generada (Prompt Bleed)`,
        });
      }
    }
  }

  // 2. Check individual token leakage if it matches internal system diagnostic terms
  const diagnosticTerms = ["instructionprompt", "sunotagsmode", "dynamismmode", "flowpocketmode", "narrativearc"];
  for (const term of diagnosticTerms) {
    if (lowerLyrics.includes(term)) {
      findings.push({
        token: term,
        category: "diagnostic_leak",
        severity: "critical",
        reason: `Variable interna del sistema "${term}" filtrada al texto`,
      });
    }
  }

  const criticalCount = findings.filter(f => f.severity === "critical").length;
  const warningCount = findings.filter(f => f.severity === "warning").length;
  const isClean = criticalCount === 0 && warningCount === 0;
  const score = Math.max(0, 100 - criticalCount * 40 - warningCount * 15);

  return {
    isClean,
    score,
    criticalCount,
    warningCount,
    findings,
  };
}

/**
 * Sanitizes user input before entering prompt builder to prevent syntax breaks or accidental tokens.
 */
export function sanitizeUserInput(input: string): string {
  if (!input) return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[{}\\]/g, "")
    .trim();
}
